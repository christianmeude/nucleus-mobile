import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import * as Haptics from 'expo-haptics';

interface SegmentOption<K extends string> {
  key: K;
  label: string;
}

interface SegmentedControlProps<K extends string> {
  options: SegmentOption<K>[];
  value: K;
  onValueChange: (key: K) => void;
}

export function SegmentedControl<K extends string>({
  options,
  value,
  onValueChange,
}: SegmentedControlProps<K>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => {
              if (!active) {
                Haptics.selectionAsync().catch(() => undefined);
                onValueChange(opt.key);
              }
            }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: t.colors.surface.sunken,
      borderRadius: 9999,
      borderCurve: 'continuous',
      padding: 4,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 9999,
      borderCurve: 'continuous',
    },
    segmentActive: {
      backgroundColor: t.colors.surface.raised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
    },
    label: {
      ...t.typography.label,
      color: t.colors.text.secondary,
      textAlign: 'center',
    },
    labelActive: {
      color: t.colors.brand.primary,
    },
  });
