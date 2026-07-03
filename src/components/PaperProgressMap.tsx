import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaperStatus } from '../types/domain';
import { statusToLabel } from '../utils/format';
import { theme } from '../theme';

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

const PulseRing = ({ color }: { color: string }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseRing,
        {
          borderColor: color,
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
        },
      ]}
    />
  );
};

interface PaperProgressMapProps {
  status: PaperStatus;
}

export const PaperProgressMap = ({ status }: PaperProgressMapProps) => {
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

          return (
            <View key={label} style={styles.stepWrap}>
              {index > 0 ? (
                <View
                  style={[
                    styles.connector,
                    index <= filledThrough && { backgroundColor: barColor },
                  ]}
                />
              ) : null}
              <View style={styles.markerHost}>
                {state === 'pending' ? <PulseRing color={theme.colors.brand.primary} /> : null}
                <View
                  style={[
                    styles.marker,
                    state === 'done' && { backgroundColor: theme.colors.brand.primary },
                    state === 'complete' && { backgroundColor: theme.colors.state.success },
                    state === 'warning' && { backgroundColor: theme.colors.state.warning },
                    state === 'danger' && { backgroundColor: theme.colors.state.danger },
                    (state === 'pending' || state === 'upcoming') && styles.markerHollow,
                    state === 'pending' && { borderColor: theme.colors.brand.primary },
                  ]}
                >
                  {state === 'done' || state === 'complete' ? (
                    <Ionicons name="checkmark" size={10} color={theme.colors.text.onBrand} />
                  ) : null}
                  {state === 'warning' ? (
                    <Ionicons name="alert" size={9} color={theme.colors.text.onBrand} />
                  ) : null}
                  {state === 'danger' ? (
                    <Ionicons name="close" size={9} color={theme.colors.text.onBrand} />
                  ) : null}
                </View>
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {STAGES.map((label, index) => {
          const isBlocked = index === blockedIndex;
          const isActive = isBlocked || (!isComplete && index === currentIndex) || (isComplete && index === 4);
          return (
            <Text
              key={label}
              numberOfLines={1}
              style={[
                styles.label,
                isActive && styles.labelActive,
                isBlocked && { color: blockedColor },
              ]}
            >
              {label}
            </Text>
          );
        })}
      </View>
      {blockedIndex >= 0 ? (
        <Text style={[styles.caption, { color: blockedColor }]}>{statusToLabel(status)}</Text>
      ) : null}
    </View>
  );
};

const MARKER_SIZE = 16;

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
    marginTop: 2,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.border.subtle,
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
    borderRadius: theme.radii.pill,
    borderWidth: 2,
  },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerHollow: {
    backgroundColor: theme.colors.surface.raised,
    borderWidth: 1.5,
    borderColor: theme.colors.border.strong,
  },
  labels: {
    flexDirection: 'row',
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontFamily: theme.fontFamilies.ui.medium,
    fontSize: 9,
    color: theme.colors.text.disabled,
  },
  labelActive: {
    fontFamily: theme.fontFamilies.ui.semibold,
    color: theme.colors.text.primary,
  },
  caption: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
});
