import { Ionicons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

type DialogTone = 'danger' | 'info' | 'success' | 'warning';
type DialogButtonVariant = 'danger' | 'ghost' | 'primary' | 'secondary';

export type AppDialogAction = {
  label: string;
  onPress: () => void;
  variant?: DialogButtonVariant;
};

type AppDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  tone?: DialogTone;
  actions: AppDialogAction[];
  onClose?: () => void;
};

const toneConfig: Record<DialogTone, { background: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  danger: {
    background: colors.dangerSurface,
    color: colors.danger,
    icon: 'alert-circle-outline',
  },
  info: {
    background: colors.iconBlueBackground,
    color: colors.primary,
    icon: 'information-circle-outline',
  },
  success: {
    background: colors.successBackground,
    color: colors.success,
    icon: 'checkmark-circle-outline',
  },
  warning: {
    background: colors.iconOrangeBackground,
    color: colors.warning,
    icon: 'warning-outline',
  },
};

export function AppDialog({
  visible,
  title,
  message,
  tone = 'info',
  actions,
  onClose,
}: AppDialogProps): React.ReactElement {
  const config = toneConfig[tone];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: config.background }]}>
            <Ionicons name={config.icon} size={30} color={config.color} />
          </View>
          <AppText variant="label" style={styles.title}>
            {title}
          </AppText>
          {message ? (
            <ScrollView style={styles.messageScroll} bounces={false}>
              <AppText variant="body" muted style={styles.message}>
                {message}
              </AppText>
            </ScrollView>
          ) : null}
          <View style={styles.actions}>
            {actions.map((action, index) => (
              <View key={`${action.label}-${index}`} style={index > 0 ? styles.actionGap : null}>
                <Button
                  label={action.label}
                  variant={action.variant ?? (index === 0 ? 'primary' : 'secondary')}
                  onPress={action.onPress}
                />
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxWidth: 380,
    padding: spacing.xl,
    width: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 56,
  },
  title: {
    fontSize: 18,
  },
  message: {
    lineHeight: 22,
  },
  messageScroll: {
    marginTop: spacing.sm,
    maxHeight: 180,
  },
  actions: {
    marginTop: spacing.xl,
  },
  actionGap: {
    marginTop: spacing.sm,
  },
});
