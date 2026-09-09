import type { MobileSchedulePlanDto, MobileSchedulePlanItemDto } from '@patrol/shared';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getDatabase, SCHEDULE_PLAN_TABLE } from '@/db';
import { ensureNotificationPermission } from '@/device/push';

import { buildScheduleReminders, type ScheduleReminder } from './schedule-reminders';

const REMINDER_CHANNEL_ID = 'patrol-reminders';

type StoredPlanRow = {
  dismissed_at: string | null;
  occurrence_key: string;
  notification_at: string;
  notification_id: string | null;
};

let operationQueue: Promise<void> = Promise.resolve();

export function reconcileSchedulePlan(plan: MobileSchedulePlanDto): Promise<void> {
  operationQueue = operationQueue.catch(() => undefined).then(() => reconcile(plan));
  return operationQueue;
}

export function clearSchedulePlanNotifications(): Promise<void> {
  operationQueue = operationQueue.catch(() => undefined).then(clearNotifications);
  return operationQueue;
}

export function dismissCurrentScheduleReminders(
  scheduleId: string,
  startedAt = new Date(),
): Promise<void> {
  operationQueue = operationQueue
    .catch(() => undefined)
    .then(() => dismissCurrentOccurrence(scheduleId, startedAt));
  return operationQueue;
}

async function clearNotifications(): Promise<void> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<StoredPlanRow>(
    `SELECT occurrence_key, notification_at, notification_id, dismissed_at
       FROM ${SCHEDULE_PLAN_TABLE}`,
  );
  await Promise.all(rows.map((row) => cancelNotification(row.notification_id)));
  await database.runAsync(`DELETE FROM ${SCHEDULE_PLAN_TABLE}`);
}

async function dismissCurrentOccurrence(scheduleId: string, startedAt: Date): Promise<void> {
  const database = await getDatabase();
  const startedAtIso = startedAt.toISOString();
  const rows = await database.getAllAsync<StoredPlanRow>(
    `SELECT occurrence_key, notification_at, notification_id, dismissed_at
       FROM ${SCHEDULE_PLAN_TABLE}
      WHERE schedule_id = ?
        AND available_from <= ?
        AND due_at > ?`,
    [scheduleId, startedAtIso, startedAtIso],
  );

  await Promise.all(rows.map((row) => cancelNotification(row.notification_id)));
  await database.withTransactionAsync(async () => {
    for (const row of rows) {
      await database.runAsync(
        `UPDATE ${SCHEDULE_PLAN_TABLE}
            SET notification_id = NULL, dismissed_at = ?
          WHERE occurrence_key = ?`,
        [startedAtIso, row.occurrence_key],
      );
    }
  });
}

async function reconcile(plan: MobileSchedulePlanDto): Promise<void> {
  const database = await getDatabase();
  const storedRows = await database.getAllAsync<StoredPlanRow>(
    `SELECT occurrence_key, notification_at, notification_id, dismissed_at
       FROM ${SCHEDULE_PLAN_TABLE}`,
  );
  const storedByKey = new Map(storedRows.map((row) => [row.occurrence_key, row]));
  const now = Date.now();
  const reminders = plan.items.flatMap((item) => buildScheduleReminders(item, now));

  const permissionGranted = await ensureNotificationPermission();
  if (permissionGranted) {
    await configureReminderChannel();
  }

  const nextRows: Array<{
    key: string;
    item: MobileSchedulePlanItemDto;
    dismissedAt: string | null;
    notificationAt: string;
    notificationId: string | null;
  }> = [];

  for (const reminder of reminders) {
    const { item, key, notificationAt } = reminder;
    const stored = storedByKey.get(reminder.key);
    const unchanged = stored?.notification_at === notificationAt;
    const dismissedAt = unchanged ? stored.dismissed_at : null;
    let notificationId = unchanged ? stored.notification_id : null;

    if (!dismissedAt && !notificationId && permissionGranted) {
      notificationId = await scheduleReminder(reminder);
    }
    nextRows.push({ dismissedAt, key, item, notificationAt, notificationId });
  }

  const nextIds = new Set(nextRows.map((row) => row.notificationId).filter(Boolean));
  await database.withTransactionAsync(async () => {
    await database.runAsync(`DELETE FROM ${SCHEDULE_PLAN_TABLE}`);
    for (const row of nextRows) {
      await database.runAsync(
        `INSERT INTO ${SCHEDULE_PLAN_TABLE}
          (occurrence_key, schedule_id, shop_id, shop_name, schedule_name, planned_start_at,
           available_from, due_at, notification_at, notification_id, dismissed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.key,
          row.item.scheduleId,
          row.item.shopId,
          row.item.shopName,
          row.item.scheduleName,
          toIsoString(row.item.plannedStartAt),
          toIsoString(row.item.availableFrom),
          toIsoString(row.item.dueAt),
          row.notificationAt,
          row.notificationId,
          row.dismissedAt,
        ],
      );
    }
  });

  await Promise.all(
    storedRows
      .filter((row) => row.notification_id && !nextIds.has(row.notification_id))
      .map((row) => cancelNotification(row.notification_id)),
  );
}

async function configureReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Напоминания об обходах',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function scheduleReminder(reminder: ScheduleReminder): Promise<string | null> {
  const { body, title } = reminderContent(reminder);
  const { item } = reminder;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: {
          type: 'patrol_schedule_available',
          shopId: item.shopId,
          scheduleId: item.scheduleId,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(reminder.notificationAt),
        channelId: Platform.OS === 'android' ? REMINDER_CHANNEL_ID : undefined,
      },
    });
  } catch {
    return null;
  }
}

function reminderContent(reminder: ScheduleReminder): { body: string; title: string } {
  const prefix = `${reminder.item.shopName}: ${reminder.item.scheduleName}.`;

  if (reminder.kind === 'available') {
    return {
      body: `${prefix} Можно начинать обход.`,
      title: 'Обход доступен',
    };
  }

  if (reminder.kind === 'planned') {
    return {
      body: `${prefix} Наступило плановое время начала.`,
      title: 'Время начать обход',
    };
  }

  return {
    body: `${prefix} Плановое время начала было ${reminder.delayMinutes} мин. назад.`,
    title: 'Обход ещё не начат',
  };
}

async function cancelNotification(identifier: string | null): Promise<void> {
  if (!identifier) {
    return;
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Уведомление могло уже сработать или быть удалено системой.
  }
}

function toIsoString(value: Date): string {
  return new Date(String(value)).toISOString();
}
