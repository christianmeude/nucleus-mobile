import { ReactNode, useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

interface SheetPresenterProps {
  open: boolean;
  onClose: () => void;
  /** Sheet content — only mounted while presenting, so heavy content (e.g. a PDF
   * WebView) never loads until the sheet opens. */
  sheet: ReactNode;
  /** The presenting screen; dims behind the sheet (it does not zoom out). */
  children: ReactNode;
  sheetAccessibilityLabel?: string;
  /**
   * `full` stretches from the status bar down — for content that wants the whole
   * screen (the PDF reader). `content` hugs its own height, anchored to the
   * bottom — for short forms. Defaults to `full`.
   */
  size?: 'full' | 'content';
}

/**
 * Sheet presentation (DESIGN.md Motion → Sheet presentation).
 * When `open`, `sheet` slides up from the bottom over a dim scrim; the
 * presenting screen stays put and dims behind it. `sheet` is only mounted while
 * presenting, so its content never loads until opened. Drag the grabber down,
 * tap the scrim, or press Android back to dismiss. Reduced-motion → instant, no
 * fade or slide.
 *
 * The screen does **not** zoom out. A scaled presenter was tried and dropped
 * (2026-10-21): rounding/scaling the live screen exposed the root's black
 * background at the top and clipped the bottom of the tab bar mid-animation, and
 * it fought the scroll views during the spring. The sheet and scrim carry the
 * depth instead.
 *
 * The scrim and the sheet live in a React Native `Modal`, not just in the
 * screen's view tree: the tab bar is a sibling of the screen inside the
 * navigator, so an in-tree overlay always paints *under* it. A modal is its own
 * window, so the sheet is above everything, and taps on the tab bar are blocked
 * while it is open.
 *
 * The motion is a spring — damping 22 / stiffness 240 / mass 0.9 on open, a 260ms
 * timed close — specced in DESIGN.md; port those values exactly (Rule 9).
 */
const SHEET_SPRING = { damping: 22, stiffness: 240, mass: 0.9 } as const;
const CLOSE_DURATION = 260;
const SCRIM_MAX_OPACITY = 0.45;
/** Fraction of the sheet's height it must be dragged past to dismiss on release. */
const DISMISS_FRACTION = 0.28;
const DISMISS_VELOCITY = 900;

export const SheetPresenter = ({
  open,
  onClose,
  sheet,
  children,
  sheetAccessibilityLabel,
  size = 'full',
}: SheetPresenterProps) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const sheetTop = insets.top;
  const maxSheetHeight = height - sheetTop;

  const progress = useSharedValue(open ? 1 : 0);
  const drag = useSharedValue(0);
  // Actual sheet height, measured on layout. A content sheet is only as tall as
  // its content, so the reveal/dismiss math cannot assume the screen height.
  // Full sheets start at their known height so the first frame is already dimmed
  // correctly, before `onLayout` lands.
  const sheetHeight = useSharedValue(size === 'full' ? maxSheetHeight : 0);
  // Keep the sheet mounted through its close animation, then unmount so its
  // content (the PDF) is torn down and never lingers loaded behind the screen.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      drag.value = 0;
      progress.value = reducedMotion ? 1 : withSpring(1, SHEET_SPRING);
    } else if (reducedMotion) {
      progress.value = 0;
      setMounted(false);
    } else {
      progress.value = withTiming(0, { duration: CLOSE_DURATION }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reducedMotion]);

  const handleSheetLayout = useCallback(
    (event: LayoutChangeEvent) => {
      sheetHeight.value = event.nativeEvent.layout.height;
    },
    [sheetHeight],
  );

  // Android hardware back dismisses the sheet rather than popping the screen.
  // The modal's own `onRequestClose` covers the modal window; this listener is
  // the fallback for the frame before it mounts.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  // `reveal` is the sheet's live progress up the screen (1 fully up, 0 hidden),
  // computed from the sheet's own height — the open/close spring *and* any active
  // drag. Driving the scrim off it (not off `progress` alone) makes the scrim
  // lighten in proportion as the sheet is dragged down, instead of staying fully
  // dark until release. The screen itself does not move, scale, or take a second
  // dim layer: one scrim over the whole screen (tab bar and status bar included)
  // keeps the darkness uniform.
  const scrimStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [height, 0]) + drag.value;
    const reveal = Math.min(1, Math.max(0, 1 - translateY / Math.max(sheetHeight.value, 1)));
    return { opacity: reveal };
  });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [height, 0]) + drag.value }],
  }));

  const dragGesture = Gesture.Pan()
    .onUpdate((event) => {
      drag.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      const dismissed =
        drag.value > sheetHeight.value * DISMISS_FRACTION || event.velocityY > DISMISS_VELOCITY;
      if (dismissed) {
        runOnJS(onClose)();
        drag.value = withTiming(0, { duration: CLOSE_DURATION });
      } else {
        drag.value = withSpring(0, SHEET_SPRING);
      }
    });

  return (
    <View style={styles.root}>
      <View style={styles.presenter}>{children}</View>

      {mounted ? (
        <Modal
          visible
          transparent
          animationType="none"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={onClose}
        >
          {/* Gestures inside a modal need their own handler root on Android. */}
          <GestureHandlerRootView style={styles.modalRoot}>
            <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
              <Pressable
                style={styles.scrim}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
              />
            </Animated.View>

            <KeyboardAvoidingView
              style={styles.keyboardAvoider}
              pointerEvents="box-none"
              // Edge-to-edge (app.config) disables Android's adjustResize, so
              // content sheets need the explicit keyboard inset or their submit
              // button sits under the keyboard. Full sheets (the PDF reader) are
              // left alone: their content is not bottom-anchored.
              behavior={size === 'content' ? 'padding' : undefined}
            >
              <View style={styles.sheetWrap} pointerEvents="box-none">
                <Animated.View
                  onLayout={handleSheetLayout}
                  style={[
                    styles.sheet,
                    size === 'content'
                      ? [styles.contentSheet, { maxHeight: maxSheetHeight, paddingBottom: insets.bottom }]
                      : { height: maxSheetHeight },
                    sheetStyle,
                  ]}
                  accessibilityViewIsModal
                  accessibilityLabel={sheetAccessibilityLabel}
                >
                  <GestureDetector gesture={dragGesture}>
                    <View style={styles.grabZone}>
                      <View style={styles.grabber} />
                    </View>
                  </GestureDetector>
                  <View style={size === 'content' ? styles.sheetBodyContent : styles.sheetBodyFill}>
                    {sheet}
                  </View>
                </Animated.View>
              </View>
            </KeyboardAvoidingView>
          </GestureHandlerRootView>
        </Modal>
      ) : null}
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: '#000',
    },
    presenter: {
      flex: 1,
      overflow: 'hidden',
      backgroundColor: t.colors.surface.base,
    },
    modalRoot: {
      flex: 1,
    },
    scrim: {
      flex: 1,
      backgroundColor: `rgba(0, 0, 0, ${SCRIM_MAX_OPACITY})`,
    },
    keyboardAvoider: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    sheetWrap: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      width: '100%',
      backgroundColor: t.colors.surface.raised,
      borderTopLeftRadius: t.radii.xl,
      borderTopRightRadius: t.radii.xl,
      borderCurve: 'continuous',
      overflow: 'hidden',
      ...t.shadows.level2,
    },
    contentSheet: {
      // Height comes from the content, capped by `maxHeight` inline. The
      // grabber + body stay mounted only while the sheet is presenting.
      minHeight: 120,
    },
    grabZone: {
      // Comfortable drag target — the grabber itself is only 4px, so the zone
      // pads out to a ~44px touch/drag area (a11y minimum).
      paddingTop: t.spacing.md,
      paddingBottom: t.spacing.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    grabber: {
      width: 42,
      height: 4,
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
      backgroundColor: t.colors.border.strong,
    },
    /** PDF viewer: fill the sheet exactly. */
    sheetBodyFill: {
      flex: 1,
    },
    /** Short forms: take the content's height, shrink instead of overflowing. */
    sheetBodyContent: {
      flexShrink: 1,
    },
  });
