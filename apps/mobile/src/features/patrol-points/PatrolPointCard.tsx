import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { RoutePoint } from '@/api/types';
import { colors, spacing } from '@/theme';
import { AppText, Card, EntityIcon, StatusLabel } from '@/ui';

type PatrolPointCardProps = {
  point: RoutePoint;
  onPress: (point: RoutePoint) => void;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
};

function PatrolPointCardComponent({
  point,
  onPress,
  trailingIcon = 'chevron-forward',
}: PatrolPointCardProps): React.ReactElement {
  const hasNfc = Boolean(point.nfcTagId ?? point.nfcTag?.id);

  return (
    <Card style={styles.card} onPress={() => onPress(point)}>
      <View style={styles.row}>
        <EntityIcon icon="location-outline" tone={point.isActive ? 'primary' : 'danger'} />
        <View style={styles.content}>
          <AppText variant="label" muted={!point.isActive} numberOfLines={2}>
            {point.name}
          </AppText>
          {point.description ? (
            <AppText variant="caption" muted numberOfLines={2} style={styles.meta}>
              {point.description}
            </AppText>
          ) : null}
          <View style={styles.capabilities}>
            <Ionicons
              name={hasNfc ? 'radio-outline' : 'alert-circle-outline'}
              size={14}
              color={hasNfc ? colors.success : colors.warning}
            />
            <AppText
              variant="caption"
              color={hasNfc ? colors.success : colors.warning}
              style={styles.capabilityText}
            >
              {hasNfc ? 'NFC привязана' : 'Без NFC-метки'}
            </AppText>
            {point.photoFileId ? (
              <View style={styles.photoStatus}>
                <Ionicons name="image-outline" size={14} color={colors.textMuted} />
                <AppText variant="caption" muted style={styles.photoText}>
                  Есть фото
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.trailing}>
          <StatusLabel
            label={point.isActive ? 'Активна' : 'В архиве'}
            tone={point.isActive ? 'success' : 'danger'}
          />
          <Ionicons name={trailingIcon} size={20} color={colors.textMuted} />
        </View>
      </View>
    </Card>
  );
}

export const PatrolPointCard = memo(PatrolPointCardComponent);

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    minHeight: 112,
    padding: spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  meta: {
    marginTop: spacing.xs,
  },
  capabilities: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  capabilityText: {
    fontSize: 12,
    marginLeft: spacing.xs,
  },
  photoStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: spacing.sm,
  },
  photoText: {
    fontSize: 12,
    marginLeft: spacing.xs,
  },
  trailing: {
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    marginLeft: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
