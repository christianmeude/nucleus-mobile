import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Check, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';

export interface FilterSelectOption<K extends string> {
  key: K;
  label: string;
}

interface FilterSelectProps<K extends string> {
  /** Group name shown on the trigger and as the sheet title (e.g. "Status"). */
  label: string;
  options: FilterSelectOption<K>[];
  value: K;
  /** Key that counts as "no filtering" — trigger renders neutral for it. */
  defaultValue: K;
  onValueChange: (key: K) => void;
}

/**
 * Single-select status filter as one compact trigger row opening a
 * bottom-sheet radio list. Used where a wrapping pill row would cost two
 * rows of header bulk. Speaks the same sheet + check-row language as
 * BrowseFilterSystem; navy-fill active treatment per the Active-Fill Rule.
 */
export function FilterSelect<K extends string>({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
}: FilterSelectProps<K>) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const sheetRef = useRef<BottomSheetModal>(null);

  const current = options.find((o) => o.key === value) ?? options[0];
  const isActive = value !== defaultValue;

  const choose = (key: K) => {
    if (key === value) return;
    Haptics.selectionAsync().catch(() => undefined);
    onValueChange(key);
    sheetRef.current?.dismiss();
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.trigger, isActive && styles.triggerActive, pressed && styles.pressed]}
        onPress={() => sheetRef.current?.present()}
        accessibilityRole="button"
        accessibilityLabel={`${label} filter, ${current?.label ?? ''} selected`}
        accessibilityHint={`Opens ${label.toLowerCase()} options`}
      >
        <Text style={[styles.triggerPrefix, isActive && styles.triggerPrefixActive]}>
          {label} · <Text style={[styles.triggerValue, isActive && styles.triggerValueActive]}>{current?.label}</Text>
        </Text>
        <Icon
          icon={ChevronDown}
          size={18}
          color={isActive ? theme.colors.text.onBrand : theme.colors.text.secondary}
        />
      </Pressable>

      <BottomSheet ref={sheetRef}>
        <Text style={styles.sheetTitle}>{label}</Text>
        <View style={styles.sheetList}>
          {options.map((opt) => {
            const selected = opt.key === value;
            return (
              <Pressable
                key={opt.key}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => choose(opt.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${opt.label}${selected ? ', selected' : ''}`}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <Icon icon={Check} size={14} color={theme.colors.text.onBrand} />}
                </View>
                <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.pill,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderColor: theme.colors.border.strong,
      backgroundColor: theme.colors.surface.raised,
    },
    triggerActive: {
      backgroundColor: theme.colors.brand.primary,
      borderColor: theme.colors.brand.primary,
    },
    triggerPrefix: {
      ...theme.typography.label,
      color: theme.colors.text.secondary,
    },
    triggerPrefixActive: {
      color: theme.colors.text.onBrand,
    },
    triggerValue: {
      color: theme.colors.text.primary,
    },
    triggerValueActive: {
      color: theme.colors.text.onBrand,
    },
    sheetTitle: {
      ...theme.typography.h3,
      color: theme.colors.text.primary,
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xs,
    },
    sheetList: {
      paddingHorizontal: theme.spacing.xl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      minHeight: 48,
      paddingVertical: theme.spacing.sm,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderCurve: 'continuous',
      borderWidth: 2,
      borderColor: theme.colors.border.strong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      backgroundColor: theme.colors.brand.primary,
      borderColor: theme.colors.brand.primary,
    },
    rowLabel: {
      ...theme.typography.body,
      color: theme.colors.text.primary,
      flex: 1,
    },
    rowLabelSelected: {
      color: theme.colors.brand.primary,
      fontFamily: theme.fontFamilies.ui.semibold,
    },
    pressed: {
      opacity: 0.85,
    },
  });
