import { ReactNode, useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { motion, type Theme } from '../../theme';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

const CLOSE_DURATION = 240;
/** Fraction of the sheet's height it must be dragged past to dismiss on release. */
const DISMISS_FRACTION = 0.3;
const DISMISS_VELOCITY = 900;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Bottom sheet with a single shared progress value driving *both* the sheet's
 * slide and the backdrop dim, so the scrim fades in lock-step with the sheet's
 * height instead of snapping to full opacity the instant the modal mounts. Drag
 * the grabber down (or flick) to dismiss — the dim tracks the drag, lightening
 * as the sheet is pulled away. Reduced motion → instant, no slide or fade.
 */
export const BottomSheet = ({ visible, onClose, children }: BottomSheetProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { height: screenHeight } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  // Keep the Modal mounted through the close animation, then unmount.
  const [rendered, setRendered] = useState(visible);
  // Measured sheet height; falls back to the screen height until first layout so
  // the sheet always starts fully off-screen.
  const [sheetHeight, setSheetHeight] = useState(screenHeight);

  const progress = useSharedValue(visible ? 1 : 0);
  const drag = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      drag.value = 0;
      progress.value = reducedMotion ? 1 : withSpring(1, motion.spring.sheet);
    } else if (reducedMotion) {
      progress.value = 0;
      setRendered(false);
    } else {
      progress.value = withTiming(0, { duration: CLOSE_DURATION }, (finished) => {
        if (finished) runOnJS(setRendered)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reducedMotion]);

  const onSheetLayout = (event: LayoutChangeEvent) => {
    const h = event.nativeEvent.layout.height;
    if (h > 0) setSheetHeight(h);
  };

  // Sheet offset from its resting (fully-up) position: 0 when open, `sheetHeight`
  // when hidden, plus any active drag. The backdrop's dim is derived from the
  // same value so it fades in lock-step with the sheet's height (1 fully up → 0
  // hidden), lightening as the sheet is dragged away.
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * sheetHeight + drag.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => {
    const translate = (1 - progress.value) * sheetHeight + drag.value;
    return { opacity: Math.min(1, Math.max(0, 1 - translate / sheetHeight)) };
  });

  const dragGesture = Gesture.Pan()
    .onUpdate((event) => {
      drag.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      const dismissed =
        drag.value > sheetHeight * DISMISS_FRACTION || event.velocityY > DISMISS_VELOCITY;
      if (dismissed) {
        drag.value = withTiming(0, { duration: CLOSE_DURATION });
        runOnJS(onClose)();
      } else {
        drag.value = withSpring(0, motion.spring.sheet);
      }
    });

  return (
    <Modal transparent visible={rendered} animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <AnimatedPressable
          style={[styles.backdrop, backdropStyle]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <Animated.View
          style={[styles.sheet, theme.shadows.level2, sheetStyle]}
          onLayout={onSheetLayout}
        >
          <GestureDetector gesture={dragGesture}>
            <View style={styles.grabZone}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.colors.surface.overlay,
    },
    sheet: {
      backgroundColor: t.colors.surface.raised,
      borderTopLeftRadius: t.radii.lg,
      borderTopRightRadius: t.radii.lg,
      borderCurve: 'continuous',
      paddingHorizontal: t.spacing.lg,
      paddingBottom: t.spacing.lg,
      gap: t.spacing.md,
    },
    grabZone: {
      // Pads the 4px grabber out to a comfortable ~28px drag/touch target.
      paddingTop: t.spacing.md,
      paddingBottom: t.spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    handle: {
      width: 42,
      height: 4,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.border.strong,
    },
  });
