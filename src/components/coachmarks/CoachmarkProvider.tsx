import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useSeenCoachmarks } from '../../hooks/useSeenCoachmarks';
import { isFirstEntranceArmed } from '../../lib/firstEntrance';
import { COACHMARK_COPY, type CoachmarkId, nextCoachmark } from './sequence';

// Bubble geometry (DESIGN.md: 6px triangle pointer, radius md, level2 shadow).
const POINTER_H = 7;
const POINTER_HALF = 7;
const EDGE = 16; // min gap from screen edge
const GAP = 8; // gap between the target control and the pointer tip
const BUBBLE_MAX = 280;

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CoachmarkContextValue {
  register: (id: CoachmarkId, node: View | null) => void;
}

const CoachmarkContext = createContext<CoachmarkContextValue | null>(null);

/**
 * Ref callback that registers a control as a coachmark target. Attach the
 * returned callback to a `View`/`Pressable`'s `ref`; passing no `id` (e.g. a
 * faculty tab with no coachmark) yields a stable no-op so the shared control
 * stays generic. Registration is harmless for non-students — the sequence only
 * ever activates for a student on the post-onboarding tab UI.
 */
export const useCoachmarkTarget = (id?: CoachmarkId) => {
  const ctx = useContext(CoachmarkContext);
  return useCallback(
    (node: View | null) => {
      if (id) ctx?.register(id, node);
    },
    [ctx, id],
  );
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

interface OverlayProps {
  step: CoachmarkId;
  rect: TargetRect;
  onAdvance: () => void;
}

/**
 * The single visible bubble for the current step: a navy tooltip with a triangle
 * pointer aimed at the measured target, `text-on-brand` copy, and a gold "Got
 * it". A full-screen transparent catcher sits behind it so a tap anywhere
 * outside also advances/ends the sequence.
 */
const CoachmarkOverlay = ({ step, rect, onAdvance }: OverlayProps) => {
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReduceMotion();
  const { width: W, height: H } = useWindowDimensions();

  // The bell sits at the top of the screen, so its bubble drops below it
  // (pointer up); the FAB and Browse tab sit at the bottom, so theirs float
  // above (pointer down).
  const below = step === 'bell';
  const targetCenterX = rect.x + rect.width / 2;
  const bubbleWidth = Math.min(BUBBLE_MAX, W - EDGE * 2);
  const left = clamp(targetCenterX - bubbleWidth / 2, EDGE, W - EDGE - bubbleWidth);
  const pointerLeft = clamp(
    targetCenterX - left - POINTER_HALF,
    12,
    bubbleWidth - 12 - POINTER_HALF * 2,
  );

  const positionStyle = below
    ? { top: rect.y + rect.height + GAP + POINTER_H }
    : { bottom: H - (rect.y - GAP - POINTER_H) };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onAdvance}
        accessibilityRole="button"
        accessibilityLabel="Dismiss tip"
      />
      <Animated.View
        key={step}
        entering={reduceMotion ? undefined : FadeIn.duration(180)}
        style={[styles.bubble, { width: bubbleWidth, left }, positionStyle]}
      >
        <Text style={styles.bubbleText}>{COACHMARK_COPY[step]}</Text>
        <Pressable
          onPress={onAdvance}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Got it"
          style={({ pressed }) => (pressed ? styles.gotItPressed : undefined)}
        >
          <Text style={styles.gotIt}>Got it</Text>
        </Pressable>
        <View
          style={[
            below ? styles.pointerUp : styles.pointerDown,
            { left: pointerLeft },
            below ? { top: -POINTER_H } : { bottom: -POINTER_H },
          ]}
          pointerEvents="none"
        />
      </Animated.View>
    </View>
  );
};

/**
 * Cross-screen coachmark host (#69). Wraps the app so a single measured overlay
 * can float above the tab navigator and point bubbles at controls that live in
 * different components (the `TopBar` bell, the `FloatingTabBar` FAB + Browse
 * tab). Those controls self-register via {@link useCoachmarkTarget}; this
 * provider measures the current target on demand and drives the one-at-a-time,
 * resumable sequence.
 *
 * It never gates on an onboarding flag directly: the targets only mount once a
 * student reaches the real tab UI (the carousel blocks the whole tree until
 * done), so the sequence is naturally post-onboarding — and only students ever
 * have these targets to measure.
 */
export const CoachmarkProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { seen, loaded, markSeen } = useSeenCoachmarks();
  const reduceMotion = useReduceMotion();
  const targets = useRef<Partial<Record<CoachmarkId, View | null>>>({});
  // The measured rect is tagged with the step it belongs to, so a stale rect
  // from the previous step self-hides via the render guard below (no
  // synchronous reset in the effect) until the new target has been measured.
  const [measured, setMeasured] = useState<{ step: CoachmarkId; rect: TargetRect } | null>(null);

  const register = useCallback((id: CoachmarkId, node: View | null) => {
    targets.current[id] = node;
  }, []);

  const active = user?.role === 'student' && loaded;
  const current = active ? nextCoachmark(seen) : null;

  // Measure the current target, retrying until it has laid out, then reveal the
  // bubble. Re-runs whenever the step changes (a dismissal advances `current`).
  // On the first launch out of onboarding the home chrome is still sliding into
  // place, so the first measurement waits for that entrance to settle — measuring
  // mid-animation would anchor the bubble to a target's transient position.
  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const retry = () => {
      if (cancelled) return;
      attempts += 1;
      if (attempts > 40) return; // ~2s ceiling; give up quietly if never laid out
      timer = setTimeout(measure, 50);
    };
    const measure = () => {
      if (cancelled) return;
      const node = targets.current[current];
      if (!node) {
        retry();
        return;
      }
      node.measureInWindow((x, y, w, h) => {
        if (cancelled) return;
        if (w > 0 && h > 0) setMeasured({ step: current, rect: { x, y, width: w, height: h } });
        else retry();
      });
    };
    const settle = isFirstEntranceArmed() && !reduceMotion ? 900 : 0;
    timer = setTimeout(measure, settle);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [current, reduceMotion]);

  const ctxValue = useMemo<CoachmarkContextValue>(() => ({ register }), [register]);

  return (
    <CoachmarkContext.Provider value={ctxValue}>
      <View style={styles.root}>
        {children}
        {current && measured?.step === current ? (
          <CoachmarkOverlay
            step={current}
            rect={measured.rect}
            onAdvance={() => markSeen(current)}
          />
        ) : null}
      </View>
    </CoachmarkContext.Provider>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    // A standard light card: white surface, hairline outline, soft elevation.
    bubble: {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
      paddingVertical: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
      backgroundColor: t.colors.surface.raised,
      borderRadius: t.radii.md,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      ...t.shadows.level2,
    },
    bubbleText: {
      flex: 1,
      ...t.typography.bodySmall,
      color: t.colors.text.primary,
    },
    gotIt: {
      ...t.typography.label,
      color: t.colors.brand.primary,
    },
    gotItPressed: {
      opacity: 0.6,
    },
    pointerUp: {
      position: 'absolute',
      width: 0,
      height: 0,
      borderLeftWidth: POINTER_HALF,
      borderRightWidth: POINTER_HALF,
      borderBottomWidth: POINTER_H,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: t.colors.surface.raised,
    },
    pointerDown: {
      position: 'absolute',
      width: 0,
      height: 0,
      borderLeftWidth: POINTER_HALF,
      borderRightWidth: POINTER_HALF,
      borderTopWidth: POINTER_H,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: t.colors.surface.raised,
    },
  });
