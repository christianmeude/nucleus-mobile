import { Fragment, memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing as ReanimatedEasing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Icon } from './ui/Icon';
import { Check, TriangleAlert, X } from 'lucide-react-native';
import { PaperStatus } from '../types/domain';
import { statusToLabel } from '../utils/format';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';

type NodeState = 'done' | 'pending' | 'upcoming' | 'warning' | 'danger' | 'complete';

/** Reviewer hierarchy, in order. Not every paper touches every level (e.g. an
 * editor-routed paper skips Adviser/Chair) — the map still renders all 5 so the
 * student always sees the full ladder and where they currently sit on it. */
const STAGES = ['Adviser', 'Chair', 'Editor', 'Admin', 'Approved'] as const;

const stageIndexForStatus = (status: PaperStatus): number => {
  switch (status) {
    case 'pending':
    case 'pending_faculty':
      return 0;
    case 'pending_dean':
    case 'pending_program_chair':
      return 1;
    case 'pending_editor':
      return 2;
    case 'pending_admin':
      return 3;
    case 'approved':
    case 'published':
      return 4;
    default:
      return 0;
  }
};

/** Static pending marker for list cards: lightweight, visually distinct active step with zero animation loops. */
const StaticPendingMarker = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.markerHost}>
      <View
        style={[
          styles.marker,
          styles.markerHollow,
          {
            borderColor: theme.colors.brand.primary,
            borderWidth: 2,
            backgroundColor: theme.colors.brand.primarySurface,
          },
        ]}
      />
    </View>
  );
};

/** Animated pending marker for detail screens: UI-thread Reanimated loop with zero JS overhead. */
const AnimatedPendingMarker = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1500, easing: ReanimatedEasing.out(ReanimatedEasing.quad) }),
      -1,
      false
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [progress]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - progress.value),
    transform: [{ scale: 1 + 1.3 * progress.value }],
  }));

  const breatheStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const scale = p < 0.5 ? 1 + 0.28 * p : 1 + 0.28 * (1 - p);
    return {
      transform: [{ scale }],
    };
  });

  return (
    <View style={styles.markerHost}>
      <Animated.View pointerEvents="none" style={[styles.pulseRing, ringStyle]} />
      <Animated.View
        style={[
          styles.marker,
          styles.markerHollow,
          { borderColor: theme.colors.brand.primary },
          breatheStyle,
        ]}
      />
    </View>
  );
};

interface PaperProgressMapProps {
  status: PaperStatus;
  variant?: 'list' | 'detail';
}

export const PaperProgressMap = memo(({ status, variant = 'list' }: PaperProgressMapProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isRejected = status === 'rejected';
  const isRevision = status === 'revision_required';
  const isComplete = status === 'approved' || status === 'published';

  /** Revision/reject only ever branch off pending_faculty today (faculty-access §4) — the
   * level that "initiated" the revision is always Adviser. */
  const blockedIndex = isRejected || isRevision ? 0 : -1;
  const currentIndex = stageIndexForStatus(status);
  const filledThrough = isComplete ? 4 : blockedIndex >= 0 ? blockedIndex : currentIndex;
  const barColor = isComplete ? theme.colors.state.success : theme.colors.brand.primary;
  const blockedColor = isRejected ? theme.colors.state.danger : theme.colors.state.warning;

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        {STAGES.map((label, index) => {
          const state: NodeState = isComplete
            ? 'complete'
            : index === blockedIndex
              ? isRejected
                ? 'danger'
                : 'warning'
              : index < currentIndex
                ? 'done'
                : index === currentIndex
                  ? 'pending'
                  : 'upcoming';
          const isActive = state !== 'upcoming' && state !== 'done';
          const labelColor = state === 'warning' || state === 'danger' ? blockedColor : undefined;

          return (
            <Fragment key={label}>
              {index > 0 ? (
                <View
                  style={[
                    styles.connector,
                    index <= filledThrough && { backgroundColor: barColor },
                  ]}
                />
              ) : null}
              <View style={styles.column}>
                {state === 'pending' ? (
                  variant === 'detail' ? (
                    <AnimatedPendingMarker />
                  ) : (
                    <StaticPendingMarker />
                  )
                ) : (
                  <View style={styles.markerHost}>
                    <View
                      style={[
                        styles.marker,
                        state === 'done' && { backgroundColor: theme.colors.brand.primary },
                        state === 'complete' && { backgroundColor: theme.colors.state.success },
                        state === 'warning' && { backgroundColor: theme.colors.state.warning },
                        state === 'danger' && { backgroundColor: theme.colors.state.danger },
                        state === 'upcoming' && styles.markerHollow,
                      ]}
                    >
                      {state === 'done' || state === 'complete' ? (
                        <Icon icon={Check} size={10} color={theme.colors.text.onBrand} />
                      ) : null}
                      {state === 'warning' ? (
                        <Icon icon={TriangleAlert} size={9} color={theme.colors.text.onBrand} />
                      ) : null}
                      {state === 'danger' ? (
                        <Icon icon={X} size={9} color={theme.colors.text.onBrand} />
                      ) : null}
                    </View>
                  </View>
                )}
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    isActive && styles.labelActive,
                    labelColor && { color: labelColor },
                  ]}
                >
                  {label}
                </Text>
              </View>
            </Fragment>
          );
        })}
      </View>
      {blockedIndex >= 0 ? (
        <Text style={[styles.caption, { color: blockedColor }]}>{statusToLabel(status)}</Text>
      ) : null}
    </View>
  );
});

PaperProgressMap.displayName = 'PaperProgressMap';

const MARKER_SIZE = 18;
const COLUMN_WIDTH = 46;

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: 4,
      marginTop: t.spacing.md,
    },
    track: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    column: {
      width: COLUMN_WIDTH,
      alignItems: 'center',
      gap: 4,
    },
    connector: {
      flex: 1,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: t.colors.border.subtle,
      marginTop: MARKER_SIZE / 2 - 1.5,
    },
    markerHost: {
      width: MARKER_SIZE,
      height: MARKER_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pulseRing: {
      position: 'absolute',
      width: MARKER_SIZE,
      height: MARKER_SIZE,
      borderRadius: t.radii.pill,
      borderWidth: 2,
      borderColor: t.colors.brand.primary,
    },
    marker: {
      width: MARKER_SIZE,
      height: MARKER_SIZE,
      borderRadius: t.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    markerHollow: {
      backgroundColor: t.colors.surface.raised,
      borderWidth: 1.5,
      borderColor: t.colors.border.strong,
    },
    label: {
      textAlign: 'center',
      fontFamily: t.fontFamilies.ui.medium,
      fontSize: 9,
      color: t.colors.text.disabled,
    },
    labelActive: {
      fontFamily: t.fontFamilies.ui.semibold,
      color: t.colors.text.primary,
    },
    caption: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 11,
      textAlign: 'center',
      marginTop: 2,
    },
  });
