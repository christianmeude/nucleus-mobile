import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { FileWarning, PenTool, CheckCircle2, Send } from 'lucide-react-native';
import { FacultyWorkloadSummary } from '../../api/faculty';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Icon } from './Icon';

interface WorkloadChartProps {
  summary: FacultyWorkloadSummary;
  onSelectFilter?: (filter: 'needs_review' | 'revisions' | 'forwarded' | 'approved') => void;
}

const RADIUS = 56;
const STROKE_WIDTH = 16;
const CX = RADIUS + STROKE_WIDTH;
const CY = RADIUS + STROKE_WIDTH;
const SIZE = CX * 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedNumber = ({ value, style }: { value: number; style: any }) => {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.Text
        key={value}
        entering={FadeIn.duration(250)}
        exiting={FadeOut.duration(150)}
        style={[style, { position: 'absolute' }]}
      >
        {value}
      </Animated.Text>
      {/* Invisible text to maintain layout width/height */}
      <Text style={[style, { opacity: 0 }]}>{value}</Text>
    </View>
  );
};

export const WorkloadChart = ({ summary, onSelectFilter }: WorkloadChartProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const total = summary.totalAssigned;
  // Use actionable total for the center (pending + revisions)
  const actionRequired = summary.pendingReview + summary.revisionRequired;

  const segments = [
    {
      key: 'needs_review' as const,
      label: 'Needs Review',
      value: summary.pendingReview,
      color: theme.colors.brand.accent,
      icon: FileWarning,
    },
    {
      key: 'revisions' as const,
      label: 'In Revision',
      value: summary.revisionRequired,
      color: theme.colors.state.warning,
      icon: PenTool,
    },
    {
      key: 'forwarded' as const,
      label: 'Forwarded',
      value: summary.forwardedByYou,
      color: theme.colors.brand.primary,
      icon: Send,
    },
    {
      key: 'approved' as const,
      label: 'Approved',
      value: summary.approvedByYou,
      color: theme.colors.state.success,
      icon: CheckCircle2,
    },
  ];

  let currentOffset = 0;

  return (
    <View style={styles.container}>
      <Animated.View style={styles.chartWrapper} entering={FadeIn.duration(400)}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <G rotation="-90" origin={`${CX}, ${CY}`}>
            {total === 0 ? (
              <Circle
                cx={CX}
                cy={CY}
                r={RADIUS}
                stroke={theme.colors.border.subtle}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
            ) : (
              segments.map((seg) => {
                if (seg.value === 0) return null;
                const percentage = seg.value / total;
                const strokeDashoffset = CIRCUMFERENCE - percentage * CIRCUMFERENCE;
                // Add a small 2px gap using strokeDasharray trick
                const gap = total > seg.value ? 4 : 0;
                const rotation = currentOffset * 360;
                currentOffset += percentage;

                return (
                  <Circle
                    key={seg.key}
                    cx={CX}
                    cy={CY}
                    r={RADIUS}
                    stroke={seg.color}
                    strokeWidth={STROKE_WIDTH}
                    strokeDasharray={`${CIRCUMFERENCE - gap} ${CIRCUMFERENCE}`}
                    strokeDashoffset={strokeDashoffset}
                    rotation={rotation}
                    origin={`${CX}, ${CY}`}
                    fill="none"
                    strokeLinecap="round"
                  />
                );
              })
            )}
          </G>
        </Svg>
        <View style={styles.centerContent} pointerEvents="none">
          <AnimatedNumber value={actionRequired} style={styles.centerNumber} />
          <Text style={styles.centerLabel}>Pending</Text>
        </View>
      </Animated.View>

      <View style={styles.legend}>
        {segments.map((seg, i) => (
          <Animated.View key={seg.key} entering={FadeInDown.delay(100 + i * 100).duration(400)}>
            <Pressable
              onPress={() => onSelectFilter?.(seg.key)}
              style={({ pressed }) => [styles.legendItem, pressed && styles.legendItemPressed]}
            >
              <View style={[styles.legendIcon, { backgroundColor: seg.color + '1A' }]}>
                <Icon icon={seg.icon} size={16} color={seg.color} />
              </View>
              <View style={styles.legendTextContainer}>
                <Text style={styles.legendLabel}>{seg.label}</Text>
                <AnimatedNumber value={seg.value} style={styles.legendValue} />
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: t.spacing.lg,
      backgroundColor: t.colors.surface.sunken,
      borderRadius: t.radii.xl,
      borderCurve: 'continuous',
      gap: t.spacing.lg,
    },
    chartWrapper: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerContent: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerNumber: {
      fontFamily: t.fontFamilies.ui.bold,
      fontSize: 28,
      color: t.colors.text.primary,
      lineHeight: 34,
    },
    centerLabel: {
      fontFamily: t.fontFamilies.ui.medium,
      fontSize: 12,
      color: t.colors.text.secondary,
    },
    legend: {
      flex: 1,
      gap: t.spacing.sm,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.md,
      paddingVertical: t.spacing.xs,
    },
    legendItemPressed: {
      opacity: 0.6,
    },
    legendIcon: {
      width: 30,
      height: 30,
      borderRadius: t.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    legendTextContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    legendLabel: {
      fontFamily: t.fontFamilies.ui.medium,
      fontSize: 14,
      color: t.colors.text.secondary,
    },
    legendValue: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 15,
      color: t.colors.text.primary,
    },
  });
