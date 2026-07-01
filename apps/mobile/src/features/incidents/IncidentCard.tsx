import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PatrolIncident } from '@/api/types';
import {
  incidentDescription,
  incidentTypeLabel,
  incidentTypeTone,
} from '@/features/incidents/incident-type';
import { formatDateTime } from '@/lib/format';
import { colors, spacing } from '@/theme';
import { AppText, Badge, Card } from '@/ui';

type IncidentCardProps = {
  incident: PatrolIncident;
  onPress: (incident: PatrolIncident) => void;
};

function IncidentCardComponent({ incident, onPress }: IncidentCardProps): React.ReactElement {
  const employee = incident.patrol?.employee?.fullName ?? 'Сотрудник';
  const incidentShop = incident.patrol?.shop ?? incident.shop;
  const shop = incidentShop?.name;

  return (
    <Card style={styles.card} onPress={() => onPress(incident)}>
      <View style={styles.topRow}>
        <Badge label={incidentTypeLabel(incident.type)} tone={incidentTypeTone(incident.type)} />
        <AppText variant="caption" muted>
          {formatDateTime(incident.createdAt, incident.patrol?.shop?.timezone)}
        </AppText>
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.info}>
          <AppText variant="body" style={styles.message}>
            {incidentDescription(incident)}
          </AppText>
          <AppText variant="caption" muted style={styles.meta}>
            {employee}
          </AppText>
          {shop ? (
            <AppText variant="caption" muted style={styles.metaShop}>
              {shop}
            </AppText>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}

export const IncidentCard = memo(IncidentCardComponent);

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  message: {
    marginBottom: spacing.xs,
  },
  meta: {
    marginTop: spacing.xs,
  },
  metaShop: {
    marginTop: spacing.xs,
  },
});
