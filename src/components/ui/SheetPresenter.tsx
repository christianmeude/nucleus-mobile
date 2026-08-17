import { ReactNode, useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
  /** The presenting screen; scales down + rounds its corners behind the sheet. */
  children: ReactNode;
  sheetAccessibilityLabel?: string;
}

/**
 * iOS-style card sheet presentation (DESIGN.md Motion → Sheet presentation).
 * When `open`, `sheet` slides up from the bottom while `children` (the presenting
 * screen) scales down + rounds its corners behind a dim scrim — the same zoom-out
 * a native iOS modal sheet does. `sheet` is only mounted while presenting, so its
 * content never loads until opened. Drag the grabber down, tap the scrim, or press
 * Android back to dismiss. Reduced-motion → instant, no scale or slide.
 *
 * The motion is a spring — damping 22 / stiffness 240 / mass 0.9 on open, a 260ms
 * timed close — specced in DESIGN.md; port those values exactly (Rule 9).
 */
const SHEET_SPRING = { damping: 22, stiffness: 240, mass: 0.9 } as const;
const CLOSE_DURATION = 260;
const PRESENTER_MIN_SCALE = 0.92;
const PRESENTER_RADIUS = 14;
const SCRIM_MAX_OPACITY = 0.45;
const PRESENTER_DIM_OPACITY = 0.35;
/** Fraction of the sheet's height it must be dragged past to dismiss on release. */
const DISMISS_FRACTION = 0.28;
const DISMISS_VELOCITY = 900;

export const SheetPresenter = ({
  open,
  onClose,
  sheet,
  children,
  sheetAccessibilityLabel,
}: SheetPresenterProps) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const sheetTop = insets.top;
  const sheetHeight = height - sheetTop;

  const progress = useSharedValue(open ? 1 : 0);
  const drag = useSharedValue(0);
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

  // Android hardware back dismisses the sheet rather than popping the screen.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  // `reveal` is the sheet's live progress up the screen (1 fully up, 0 hidden),
  // computed from the sheet's actual top — the open/close spring *and* any active
  // drag. Driving the zoom-out, dim, and scrim off it (not off `progress` alone)
  // makes the presenter pan smoothly back in as the sheet is dragged down, and
  // the scrim lighten with it, instead of staying fully zoomed until release.
  const presenterStyle = useAnimatedStyle(() => {
    const currentTop = interpolate(progress.value, [0, 1], [height, sheetTop]) + drag.value;
    const reveal = Math.min(1, Math.max(0, (height - currentTop) / sheetHeight));
    return {
      transform: [{ scale: interpolate(reveal, [0, 1], [1, PRESENTER_MIN_SCALE]) }],
      borderRadius: interpolate(reveal, [0, 1], [0, PRESENTER_RADIUS]),
      borderCurve: 'continuous',
    };
  });

  const dimStyle = useAnimatedStyle(() => {
    const currentTop = interpolate(progress.value, [0, 1], [height, sheetTop]) + drag.value;
    const reveal = Math.min(1, Math.max(0, (height - currentTop) / sheetHeight));
    return { opacity: interpolate(reveal, [0, 1], [0, PRESENTER_DIM_OPACITY]) };
  });

  const scrimStyle = useAnimatedStyle(() => {
    const currentTop = interpolate(progress.value, [0, 1], [height, sheetTop]) + drag.value;
    const reveal = Math.min(1, Math.max(0, (height - currentTop) / sheetHeight));
    return { opacity: reveal };
  });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [height, sheetTop]) + drag.value },
    ],
  }));

  const dragGesture = Gesture.Pan()
    .onUpdate((event) => {
      drag.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      const dismissed =
        drag.value > sheetHeight * DISMISS_FRACTION || event.velocityY > DISMISS_VELOCITY;
      if (dismissed) {
        runOnJS(onClose)();
        drag.value = withTiming(0, { duration: CLOSE_DURATION });
      } else {
        drag.value = withSpring(0, SHEET_SPRING);
      }
    });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.presenter, presenterStyle]}>
        {children}
        <Animated.View pointerEvents="none" style={[styles.dim, dimStyle]} />
      </Animated.View>

      {mounted ? (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
            <Pressable
              style={styles.scrim}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close paper viewer"
            />
          </Animated.View>

          <Animated.View
            style={[styles.sheet, { top: sheetTop, height: sheetHeight }, sheetStyle]}
            accessibilityViewIsModal
            accessibilityLabel={sheetAccessibilityLabel}
          >
            <GestureDetector gesture={dragGesture}>
              <View style={styles.grabZone}>
                <View style={styles.grabber} />
              </View>
            </GestureDetector>
            <View style={styles.sheetBody}>{sheet}</View>
          </Animated.View>
        </>
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
    dim: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
    },
    scrim: {
      flex: 1,
      backgroundColor: `rgba(0, 0, 0, ${SCRIM_MAX_OPACITY})`,
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      backgroundColor: t.colors.surface.raised,
      borderTopLeftRadius: t.radii.xl,
      borderTopRightRadius: t.radii.xl,
      borderCurve: 'continuous',
      overflow: 'hidden',
      ...t.shadows.level2,
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
    sheetBody: {
      flex: 1,
    },
  });
