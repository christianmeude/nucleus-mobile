import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './ui';
import { StudentAnnotation } from '../api/research';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { formatDate } from '../utils/format';

interface AnnotationPanelProps {
  annotations: StudentAnnotation[];
  visible: boolean;
  onClose: () => void;
}

export const AnnotationPanel = ({ annotations, visible, onClose }: AnnotationPanelProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const grouped = useMemo(() => {
    const groups = new Map<number | 'general', StudentAnnotation[]>();
    annotations.forEach((ann) => {
      const key = ann.pageNumber ?? 'general';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ann);
    });
    return groups;
  }, [annotations]);

  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
    if (a === 'general') return -1;
    if (b === 'general') return 1;
    return (a as number) - (b as number);
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'note':
        return 'document-text-outline';
      case 'draw':
        return 'brush-outline';
      case 'comment':
      default:
        return 'chatbubble-outline';
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.title}>Reviewer Feedback</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {annotations.length === 0 ? (
          <Text style={styles.empty}>No annotations for this paper.</Text>
        ) : (
          sortedKeys.map((key) => (
            <View key={String(key)} style={styles.group}>
              <Text style={styles.groupHeader}>
                {key === 'general' ? 'General Comments' : `Page ${key}`}
              </Text>
              {grouped.get(key)!.map((ann) => (
                <View key={ann.id} style={styles.item}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemMeta}>
                      <Ionicons
                        name={getIconForType(ann.annotationType)}
                        size={16}
                        color={theme.colors.text.muted}
                      />
                      <Text style={styles.reviewerName}>{ann.reviewerName}</Text>
                      {ann.reviewerRole ? (
                        <Text style={styles.reviewerRole}>({ann.reviewerRole})</Text>
                      ) : null}
                    </View>
                    <Text style={styles.date}>{formatDate(ann.createdAt)}</Text>
                  </View>
                  {ann.note ? <Text style={styles.note}>{ann.note}</Text> : null}
                  {ann.annotationType === 'draw' && ann.drawImageUrl ? (
                    <Image
                      source={{ uri: ann.drawImageUrl }}
                      style={styles.thumbnail}
                      resizeMode="contain"
                    />
                  ) : null}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </BottomSheet>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    header: {
      paddingVertical: t.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.colors.border.subtle,
      marginBottom: t.spacing.sm,
    },
    title: {
      ...t.typography.h3,
      color: t.colors.text.primary,
    },
    content: {
      paddingBottom: t.spacing.xl,
    },
    empty: {
      ...t.typography.body,
      color: t.colors.text.muted,
      textAlign: 'center',
      marginTop: t.spacing.xl,
    },
    group: {
      marginBottom: t.spacing.lg,
    },
    groupHeader: {
      ...t.typography.label,
      color: t.colors.brand.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: t.spacing.md,
    },
    item: {
      backgroundColor: t.colors.surface.base,
      borderRadius: t.radii.md,
      padding: t.spacing.md,
      marginBottom: t.spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: t.spacing.sm,
    },
    itemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs,
    },
    reviewerName: {
      ...t.typography.bodyStrong,
      color: t.colors.text.primary,
    },
    reviewerRole: {
      ...t.typography.caption,
      color: t.colors.text.muted,
    },
    date: {
      ...t.typography.caption,
      color: t.colors.text.muted,
    },
    note: {
      ...t.typography.body,
      color: t.colors.text.secondary,
    },
    thumbnail: {
      width: '100%',
      height: 120,
      marginTop: t.spacing.sm,
      borderRadius: t.radii.sm,
      backgroundColor: t.colors.surface.sunken,
    },
  });
