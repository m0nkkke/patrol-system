import type { AnonymousAppealCategory, AnonymousAppealStatus } from '@patrol/shared';

export const APPEAL_CATEGORY_LABELS: Record<AnonymousAppealCategory, string> = {
  message: 'Сообщение',
  complaint: 'Жалоба',
  safety: 'Безопасность',
  other: 'Другое',
};

export const APPEAL_STATUS_LABELS: Record<AnonymousAppealStatus, string> = {
  new: 'Новое',
  in_review: 'На рассмотрении',
  resolved: 'Решено',
  archived: 'В архиве',
};

export const APPEAL_STATUS_TONES: Record<
  AnonymousAppealStatus,
  'neutral' | 'success' | 'warning'
> = {
  new: 'warning',
  in_review: 'warning',
  resolved: 'success',
  archived: 'neutral',
};

export function appealStatusTone(
  status: AnonymousAppealStatus,
): 'neutral' | 'success' | 'warning' {
  return APPEAL_STATUS_TONES[status];
}

export function appealCategoryIcon(
  category: AnonymousAppealCategory,
):
  | 'alert-circle-outline'
  | 'chatbubble-ellipses-outline'
  | 'ellipsis-horizontal-circle-outline'
  | 'shield-checkmark-outline' {
  switch (category) {
    case 'message':
      return 'chatbubble-ellipses-outline';
    case 'complaint':
      return 'alert-circle-outline';
    case 'safety':
      return 'shield-checkmark-outline';
    default:
      return 'ellipsis-horizontal-circle-outline';
  }
}
