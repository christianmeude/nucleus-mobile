import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaperStatus } from '../types/domain';
import { statusToLabel } from '../utils/format';
import { theme } from '../theme';

type StepState = 'done' | 'current' | 'upcoming' | 'warning' | 'danger';

const STAGES = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'adviser', label: 'Adviser' },
  { key: 'review', label: 'Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'published', label: 'Published' },
] as const;

/** pending_dean/program_chair/editor/admin all collapse into one "Review" step. */
const stageIndexForStatus = (status: PaperStatus): number => {
  switch (status) {
    case 'pending':
      return 0;
    case 'pending_faculty':
      return 1;
    case 'pending_dean':
    case 'pending_program_chair':
    case 'pending_editor':
    case 'pending_admin':
      return 2;
    case 'approved':
      return 3;
    case 'published':
      return 4;
    default:
      return 0;
  }
};

const MARKER_COLOR: Record<StepState, string> = {
  done: theme.colors.brand.primary,
  current: theme.colors.brand.primary,
  upcoming: theme.colors.surface.raised,
  warning: theme.colors.state.warning,
  danger: theme.colors.state.danger,
};

interface PaperProgressMapProps {
  status: PaperStatus;
}

export const PaperProgressMap = ({ status }: PaperProgressMapProps) => {
  const isRevision = status === 'revision_required';
  const isRejected = status === 'rejected';
  /** Revision/reject only ever branch off pending_faculty (faculty-access §4). */
  const blockedIndex = isRevision || isRejected ? 1 : -1;
  const currentIndex = blockedIndex >= 0 ? blockedIndex : stageIndexForStatus(status);
  const blockedColor = isRejected ? theme.colors.state.danger : theme.colors.state.warning;

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        {STAGES.map((stage, index) => {
          const state: StepState =
            index === blockedIndex
              ? isRejected
                ? 'danger'
                : 'warning'
              : index < currentIndex
                ? 'done'
                : index === currentIndex
                  ? 'current'
                  : 'upcoming';

          return (
            <View key={stage.key} style={styles.stepWrap}>
              {index > 0 ? (
                <View
                  style={[styles.connector, index <= currentIndex && styles.connectorFilled]}
                />
              ) : null}
              <View style={[styles.marker, { backgroundColor: MARKER_COLOR[state] }, state === 'upcoming' && styles.markerUpcoming]}>
                {state === 'done' ? (
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
          );
        })}
      </View>
      <View style={styles.labels}>
        {STAGES.map((stage, index) => {
          const isBlocked = index === blockedIndex;
          const isCurrent = index === currentIndex && !isBlocked;
          return (
            <Text
              key={stage.key}
              numberOfLines={1}
              style={[
                styles.label,
                (isCurrent || isBlocked) && styles.labelActive,
                isBlocked && { color: blockedColor },
              ]}
            >
              {stage.label}
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
  connectorFilled: {
    backgroundColor: theme.colors.brand.primary,
  },
  marker: {
    width: 16,
    height: 16,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerUpcoming: {
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
