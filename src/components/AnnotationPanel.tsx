import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './ui';
import { StudentAnnotation } from '../api/research';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { formatDate } from '../utils/format';
import { ANNOTATION_ICONS } from '../utils/annotation';

interface AnnotationPanelProps {
  annotations: StudentAnnotation[];
  visible: boolean;
  onClose: () => void;
}

type AnnotationGroupKey = number | 'general';

interface ThreadedAnnotation {
  annotation: StudentAnnotation;
  replies: StudentAnnotation[];
}

export const AnnotationPanel = ({ annotations, visible, onClose }: AnnotationPanelProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const threadedGroups = useMemo(() => {
    const topLevel = new Map<string, ThreadedAnnotation>();
    const replies: StudentAnnotation[] = [];

    annotations.forEach((annotation) => {
      if (annotation.parentId) {
        replies.push(annotation);
      } else {
        topLevel.set(annotation.id, { annotation, replies: [] });
      }
    });

    replies
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
      .forEach((reply) => {
        if (reply.parentId && topLevel.has(reply.parentId)) {
          topLevel.get(reply.parentId)!.replies.push(reply);
        } else {
          topLevel.set(reply.id, { annotation: reply, replies: [] });
        }
      });

    const groups = new Map<AnnotationGroupKey, ThreadedAnnotation[]>();
    Array.from(topLevel.values()).forEach((thread) => {
      const key = thread.annotation.pageNumber ?? 'general';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(thread);
    });

    groups.forEach((threads) => {
      threads.sort(
        (a, b) =>
          new Date(a.annotation.createdAt || 0).getTime() - new Date(b.annotation.createdAt || 0).getTime()
      );
    });

    return groups;
  }, [annotations]);

  const sortedKeys = Array.from(threadedGroups.keys()).sort((a, b) => {
    if (a === 'general') return -1;
    if (b === 'general') return 1;
    return a - b;
  });

  const renderAnnotationItem = (annotation: StudentAnnotation, isReply: boolean = false) => {
    const iconName = ANNOTATION_ICONS[annotation.annotationType] || 'chatbubble-outline';

    return (
      <View key={annotation.id} style={[styles.item, isReply && styles.itemReply]}>
        <View style={styles.itemHeader}>
          <View style={styles.itemMeta}>
            <Ionicons name={iconName} size={20} color={theme.colors.text.muted} />
            <Text style={styles.reviewerName}>{annotation.reviewerName}</Text>
            {annotation.reviewerRole ? (
              <Text style={styles.reviewerRole}>({annotation.reviewerRole})</Text>
            ) : null}
          </View>
          <Text style={styles.date}>{formatDate(annotation.createdAt)}</Text>
        </View>

        {annotation.selectedText ? (
          <View style={styles.quoteBlock}>
            <Text style={styles.quoteText} numberOfLines={3}>
              "{annotation.selectedText}"
            </Text>
          </View>
        ) : null}

        {annotation.note ? <Text style={styles.note}>{annotation.note}</Text> : null}
        {annotation.annotationType === 'draw' && annotation.drawImageUrl ? (
          <Image
            source={{ uri: annotation.drawImageUrl }}
            style={styles.thumbnail}
            resizeMode="contain"
          />
        ) : null}
      </View>
    );
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
              {threadedGroups.get(key)!.map((thread) => (
                <View key={thread.annotation.id} style={styles.threadContainer}>
                  {renderAnnotationItem(thread.annotation)}
                  {thread.replies.length > 0 ? (
                    <View style={styles.repliesContainer}>
                      {thread.replies.map((reply) => renderAnnotationItem(reply, true))}
                    </View>
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

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border.subtle,
      marginBottom: theme.spacing.sm,
    },
    title: {
      ...theme.typography.h3,
      color: theme.colors.text.primary,
    },
    content: {
      paddingBottom: theme.spacing.xl,
    },
    empty: {
      ...theme.typography.body,
      color: theme.colors.text.muted,
      textAlign: 'center',
      marginTop: theme.spacing.xl,
    },
    group: {
      marginBottom: theme.spacing.lg,
    },
    groupHeader: {
      ...theme.typography.label,
      color: theme.colors.brand.primary,
      textTransform: 'uppercase',
      marginBottom: theme.spacing.md,
    },
    threadContainer: {
      marginBottom: theme.spacing.sm,
    },
    repliesContainer: {
      marginLeft: theme.spacing.lg,
      marginTop: theme.spacing.xs,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.border.subtle,
      paddingLeft: theme.spacing.sm,
    },
    item: {
      backgroundColor: theme.colors.surface.base,
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border.subtle,
    },
    itemReply: {
      backgroundColor: theme.colors.surface.sunken,
      marginBottom: theme.spacing.xs,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    itemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    reviewerName: {
      ...theme.typography.bodyStrong,
      color: theme.colors.text.primary,
    },
    reviewerRole: {
      ...theme.typography.caption,
      color: theme.colors.text.muted,
    },
    date: {
      ...theme.typography.caption,
      color: theme.colors.text.muted,
    },
    quoteBlock: {
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.brand.primary,
      paddingLeft: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surface.sunken,
      padding: theme.spacing.xs,
      borderRadius: theme.radii.sm,
    },
    quoteText: {
      ...theme.typography.body,
      fontStyle: 'italic',
      color: theme.colors.text.secondary,
    },
    note: {
      ...theme.typography.body,
      color: theme.colors.text.primary,
    },
    thumbnail: {
      width: '100%',
      height: 120,
      marginTop: theme.spacing.sm,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.surface.sunken,
    },
  });
