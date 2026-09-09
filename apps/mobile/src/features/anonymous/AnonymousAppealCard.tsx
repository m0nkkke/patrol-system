import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { AnonymousAppeal } from '@/api/anonymous.api';
import {
  APPEAL_CATEGORY_LABELS,
  APPEAL_STATUS_LABELS,
  appealCategoryIcon,
  appealStatusTone,
} from '@/features/anonymous/format';
import { formatDateTime } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import { AppText, Badge, Card } from '@/ui';

function AnonymousAppealCardComponent({
  appeal,
  onPress,
}: {
  appeal: AnonymousAppeal;
  onPress: (appeal: AnonymousAppeal) => void;
}): React.ReactElement {
  const archived = appeal.status === 'archived';

  return (
    <Card style={styles.card} onPress={() => onPress(appeal)}>
      <View style={[styles.icon, archived && styles.iconArchived]}>
        <Ionicons
          name={appealCategoryIcon(appeal.category)}
          size={22}
          color={archived ? colors.iconSlate : colors.primary}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <AppText variant="label" numberOfLines={1} style={styles.title}>
            {APPEAL_CATEGORY_LABELS[appeal.category]}
          </AppText>
          <Badge
            compact
            label={APPEAL_STATUS_LABELS[appeal.status]}
            tone={appealStatusTone(appeal.status)}
          />
        </View>
        <AppText variant="body" style={styles.message} numberOfLines={2}>
          {appeal.message}
        </AppText>
        <MetaRow icon="storefront-outline" value={appeal.shop?.name ?? 'Магазин не указан'} />
        <MetaRow icon="time-outline" value={formatDateTime(appeal.createdAt)} />
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Card>
  );
}

function MetaRow({
  icon,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
}): React.ReactElement {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={15} color={colors.textMuted} />
      <AppText variant="caption" muted numberOfLines={1} style={styles.metaText}>
        {value}
      </AppText>
    </View>
  );
}

export const AnonymousAppealCard = memo(AnonymousAppealCardComponent);

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  icon: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: radius.sm,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 44,
  },
  iconArchived: {
    backgroundColor: colors.iconSlateBackground,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
    minWidth: 0,
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  title: { flex: 1 },
  message: { marginTop: spacing.sm },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  metaText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
});
