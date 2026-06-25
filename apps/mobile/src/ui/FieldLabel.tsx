import { StyleSheet } from 'react-native';

import { colors, spacing } from '@/theme';

import { AppText } from './AppText';

type FieldLabelProps = {
  label: string;
  required?: boolean;
};

export function FieldLabel({ label, required }: FieldLabelProps): React.ReactElement {
  return (
    <AppText variant="label" style={styles.label}>
      {label}
      {required ? <AppText color={colors.danger}> *</AppText> : null}
    </AppText>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.sm,
  },
});
