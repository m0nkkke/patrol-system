import type { UserRole } from '@patrol/shared';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme';
import { AppText } from '@/ui';

import { roleLabel } from './role';

export function RoleBadge({ role }: { role: UserRole }): React.ReactElement {
  return (
    <AppText variant="caption" color={colors.roleText} style={styles.label}>
      {roleLabel(role)}
    </AppText>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: '600',
  },
});
