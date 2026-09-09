import {
  APPEAL_CATEGORY_LABELS,
  APPEAL_STATUS_LABELS,
  appealCategoryIcon,
  appealStatusTone,
} from './format';

describe('anonymous appeal formatting', () => {
  it('uses Russian category and status labels', () => {
    expect(APPEAL_CATEGORY_LABELS.safety).toBe('Безопасность');
    expect(APPEAL_STATUS_LABELS.in_review).toBe('На рассмотрении');
  });

  it('uses category-specific icons', () => {
    expect(appealCategoryIcon('message')).toBe('chatbubble-ellipses-outline');
    expect(appealCategoryIcon('complaint')).toBe('alert-circle-outline');
    expect(appealCategoryIcon('safety')).toBe('shield-checkmark-outline');
  });

  it('uses status-specific tones', () => {
    expect(appealStatusTone('new')).toBe('warning');
    expect(appealStatusTone('resolved')).toBe('success');
    expect(appealStatusTone('archived')).toBe('neutral');
  });
});
