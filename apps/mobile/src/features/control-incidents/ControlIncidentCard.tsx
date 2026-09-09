import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ControlIncident } from '@/api/control-incidents.api';
import {
  controlIncidentDescription,
  incidentSeverityLabel,
  incidentSeverityTone,
  incidentTypeIcon,
  incidentTypeLabel,
} from '@/features/incidents/incident-type';
import { formatDateTime } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import { AppText, Badge, Card } from '@/ui';

function ControlIncidentCardComponent({
  incident,
  onPress,
}: {
  incident: ControlIncident;
  onPress: (incident: ControlIncident) => void;
}): React.ReactElement {
  const critical = incident.severity === 'critical';
  const iconColor = critical ? colors.danger : colors.iconOrange;
  const iconBackground = critical ? colors.dangerSurface : colors.iconOrangeBackground;

  return (
    <Card style={styles.card} onPress={() => onPress(incident)}>
      <View style={[styles.icon, { backgroundColor: iconBackground }]}>
        <Ionicons name={incidentTypeIcon(incident.type)} size={22} color={iconColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <AppText variant="label" numberOfLines={2} style={styles.title}>
            {incidentTypeLabel(incident.type)}
          </AppText>
          <Badge
            compact
            label={incidentSeverityLabel(incident.severity)}
            tone={incidentSeverityTone(incident.severity)}
          />
        </View>
        <AppText variant="caption" muted style={styles.message} numberOfLines={3}>
          {controlIncidentDescription(incident)}
        </AppText>
        <MetaRow icon="storefront-outline" value={incident.shop.name ?? 'Магазин не указан'} />
        <MetaRow
          icon="shield-checkmark-outline"
          value={incident.employee.fullName ?? 'Сотрудник не указан'}
        />
        {incident.patrol.routeName ? (
          <MetaRow icon="git-network-outline" value={incident.patrol.routeName} />
        ) : null}
        <MetaRow icon="time-outline" value={formatDateTime(incident.createdAt)} />
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

export const ControlIncidentCard = memo(ControlIncidentCardComponent);

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
    borderRadius: radius.sm,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 44,
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
  title: {
    flex: 1,
  },
  message: {
    marginTop: spacing.sm,
  },
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
