import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Chip } from './Chip';

export interface FilterPillOption<K extends string> {
  key: K;
  label: string;
}

interface FilterPillsProps<K extends string> {
  options: FilterPillOption<K>[];
  value: K;
  onValueChange: (key: K) => void;
  accessibilityLabel?: string;
}

/**
 * Canonical single-select status filter row (per DESIGN.md Active-Fill Rule).
 *
 * Content-sized navy-fill pills in a wrapping flow: every option stays
 * visible and single-line, so neither fixed equal-segments (labels wrapping
 * mid-pill) nor a horizontal scroll-row (options hidden behind scroll) is
 * needed. Replaces both `SegmentedControl`-as-filter and bespoke pill rows.
 */
export function FilterPills<K extends string>({
  options,
  value,
  onValueChange,
  accessibilityLabel,
}: FilterPillsProps<K>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View
      style={styles.row}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Chip
            key={opt.key}
            variant="filter"
            label={opt.label}
            active={active}
            onPress={() => {
              if (!active) {
                Haptics.selectionAsync().catch(() => undefined);
                onValueChange(opt.key);
              }
            }}
          />
        );
      })}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.spacing.sm,
    },
  });
