import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/theme';

type BottomSheetModalProps = {
  children: React.ReactNode;
  onClose: () => void;
  visible: boolean;
};

const CLOSED_POSITION = Dimensions.get('window').height;

export function BottomSheetModal({
  children,
  onClose,
  visible,
}: BottomSheetModalProps): React.ReactElement {
  const translateY = useRef(new Animated.Value(CLOSED_POSITION)).current;

  useEffect(() => {
    if (!visible) {
      translateY.setValue(CLOSED_POSITION);
      return;
    }

    translateY.setValue(CLOSED_POSITION);
    Animated.timing(translateY, {
      duration: 220,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [translateY, visible]);

  function close(): void {
    Animated.timing(translateY, {
      duration: 180,
      toValue: CLOSED_POSITION,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <Animated.View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть меню"
          style={styles.backdropFill}
          onPress={close}
        />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <SafeAreaView edges={['bottom']} style={styles.safeArea}>
            {children}
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '70%',
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  safeArea: {
    flexShrink: 1,
  },
});
