import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Modal, StatusBar, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ImageViewerModalProps = {
  accessibilityLabel: string;
  onClose: () => void;
  uri: string;
  visible: boolean;
};

const DOUBLE_TAP_SCALE = 2;
const MAX_SCALE = 4;

export function ImageViewerModal({
  accessibilityLabel,
  onClose,
  uri,
  visible,
}: ImageViewerModalProps): React.ReactElement {
  const { height, width } = useWindowDimensions();
  const scale = useSharedValue(1);
  const pinchStartScale = useSharedValue(1);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 1;
      pinchStartScale.value = 1;
      translationX.value = 0;
      translationY.value = 0;
      panStartX.value = 0;
      panStartY.value = 0;
    }
  }, [
    panStartX,
    panStartY,
    pinchStartScale,
    scale,
    translationX,
    translationY,
    uri,
    visible,
  ]);

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      pinchStartScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.min(MAX_SCALE, Math.max(1, pinchStartScale.value * event.scale));
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        scale.value = withTiming(1);
        translationX.value = withTiming(0);
        translationY.value = withTiming(0);
        return;
      }

      translationX.value = withTiming(
        clampTranslation(translationX.value, scale.value, width),
      );
      translationY.value = withTiming(
        clampTranslation(translationY.value, scale.value, height),
      );
    });

  const pan = Gesture.Pan()
    .onBegin(() => {
      panStartX.value = translationX.value;
      panStartY.value = translationY.value;
    })
    .onUpdate((event) => {
      if (scale.value <= 1) {
        return;
      }
      translationX.value = clampTranslation(
        panStartX.value + event.translationX,
        scale.value,
        width,
      );
      translationY.value = clampTranslation(
        panStartY.value + event.translationY,
        scale.value,
        height,
      );
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        translationX.value = withTiming(0);
        translationY.value = withTiming(0);
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
      }
    });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.value },
      { translateY: translationY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <GestureHandlerRootView style={styles.backdrop}>
        <StatusBar barStyle="light-content" backgroundColor={colors.imageViewerBackground} />
        <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
          <Animated.View style={styles.imageCanvas}>
            <Animated.Image
              accessibilityLabel={accessibilityLabel}
              resizeMode="contain"
              source={{ uri }}
              style={[styles.image, imageStyle]}
            />
          </Animated.View>
        </GestureDetector>
        <SafeAreaView pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View style={styles.header}>
            <TouchableOpacity
              accessibilityLabel="Закрыть фотографию"
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" color={colors.textInverse} size={28} />
            </TouchableOpacity>
          </View>
          <View pointerEvents="none" style={styles.hintContainer}>
            <Animated.Text style={styles.hint}>
              Разведите пальцы или нажмите дважды для увеличения
            </Animated.Text>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

function clampTranslation(value: number, currentScale: number, viewportSize: number): number {
  'worklet';
  const limit = (viewportSize * (currentScale - 1)) / 2;
  return Math.min(limit, Math.max(-limit, value));
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.imageViewerBackground,
    flex: 1,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  header: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  hint: {
    color: colors.textInverse,
    fontSize: 13,
    textAlign: 'center',
  },
  hintContainer: {
    alignItems: 'center',
    bottom: spacing.lg,
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageCanvas: {
    flex: 1,
    overflow: 'hidden',
  },
});
