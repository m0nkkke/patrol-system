import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

type NfcScanOverlayProps = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onCancel?: () => void;
};

export function NfcScanOverlay({
  visible,
  title = 'Идёт сканирование',
  subtitle = 'Поднесите телефон к NFC-метке и удерживайте рядом несколько секунд.',
  onCancel,
}: NfcScanOverlayProps): React.ReactElement {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 900,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 900,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse, visible]);

  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1.18],
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0.08],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.scanner}>
            <Animated.View
              style={[
                styles.ring,
                {
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
            <View style={styles.iconWrap}>
              <Ionicons name="scan-outline" size={42} color={colors.textInverse} />
            </View>
          </View>

          <AppText variant="heading" color={colors.textInverse} style={styles.title}>
            {title}
          </AppText>
          <AppText variant="body" color={colors.textInverse} style={styles.subtitle}>
            {subtitle}
          </AppText>

          {onCancel ? (
            <View style={styles.action}>
              <Button label="Отмена" variant="secondary" onPress={onCancel} />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(8, 22, 52, 0.94)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  panel: {
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
  },
  scanner: {
    alignItems: 'center',
    height: 148,
    justifyContent: 'center',
    width: 148,
  },
  ring: {
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: radius.full,
    borderWidth: 2,
    height: 132,
    position: 'absolute',
    width: 132,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 92,
    justifyContent: 'center',
    width: 92,
  },
  title: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    lineHeight: 23,
    marginTop: spacing.md,
    opacity: 0.86,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.xl,
    width: '100%',
  },
});
