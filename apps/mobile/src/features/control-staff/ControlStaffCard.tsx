import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { roleLabel } from '@/features/users/role';
import { colors, spacing } from '@/theme';
import { AppText, Badge, Card } from '@/ui';

import type { ControlStaffMember } from '@/api/control-staff.api';

type ControlStaffCardProps = {
  member: ControlStaffMember;
  onPress: (member: ControlStaffMember) => void;
};

export function ControlStaffCard({ member, onPress }: ControlStaffCardProps): React.ReactElement {
  return (
    <Card style={styles.card} onPress={() => onPress(member)}>
      <View style={styles.row}>
        <View style={styles.content}>
          <AppText variant="label">{member.fullName}</AppText>
          <AppText variant="caption" muted style={styles.meta}>
            {roleLabel(member.role)} · магазинов: {member.shops.length}
          </AppText>
          <View style={styles.badge}>
            <Badge
              label={member.isActive ? 'Активен' : 'Неактивен'}
              tone={member.isActive ? 'success' : 'neutral'}
            />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, padding: spacing.lg },
  row: { alignItems: 'center', flexDirection: 'row' },
  content: { flex: 1, marginRight: spacing.sm },
  meta: { marginTop: spacing.xs },
  badge: { marginTop: spacing.sm },
});
