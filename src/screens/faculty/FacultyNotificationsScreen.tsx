import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { facultyApi } from '../../api/faculty';
import { NotificationItem } from '../../types/domain';
import { NotificationCard } from '../../components/NotificationCard';
import { ListEntranceItem } from '../../components/ListEntranceItem';
import { RootStackParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Button, EmptyState, InlineNotice, Screen, Skeleton } from '../../components/ui';

type FacultyNavigation = NativeStackNavigationProp<RootStackParamList>;

export const FacultyNotificationsScreen = () => {
  const navigation = useNavigation<FacultyNavigation>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const rows = await facultyApi.getNotifications(100);
      setNotifications(rows);
      setError('');
    } catch (_error) {
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const openNotification = async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        await facultyApi.markNotificationRead(item.id);
      } catch {
        // Keep navigation usable if read-state update fails.
      }

      setNotifications((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                is_read: true,
              }
            : entry
        )
      );
    }

    if (item.research_id) {
      navigation.navigate('FacultyReviewDetail', { paperId: item.research_id });
    }
  };

  const markAllAsRead = async () => {
    try {
      await facultyApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((entry) => ({ ...entry, is_read: true })));
    } catch {
      setError('Unable to mark all notifications as read.');
    }
  };

  return (
    <Screen edges={{ bottom: false }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        }
      >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>{unreadCount} unread</Text>
        </View>
        <View style={styles.headerRight}>
          <Button
            label="Mark all read"
            variant="subtle"
            size="sm"
            disabled={unreadCount === 0}
            onPress={markAllAsRead}
            accessibilityLabel="Mark all notifications as read"
          />
        </View>
      </View>

      {error ? <InlineNotice tone="danger" message={error} /> : null}

      {loading ? (
        <View style={styles.skeletonList}>
          <Skeleton height={96} />
          <Skeleton height={96} />
          <Skeleton height={96} />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={
            <Ionicons name="notifications-outline" size={24} color={theme.colors.text.muted} />
          }
          title="No notifications yet"
          message="Updates on your review assignments will appear here."
        />
      ) : (
        <View style={styles.list}>
          {notifications.map((item, index) => (
            <ListEntranceItem key={item.id} index={index}>
              <NotificationCard notification={item} onPress={() => openNotification(item)} />
            </ListEntranceItem>
          ))}
        </View>
      )}
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: theme.spacing.md,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing['3xl'],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  headerRight: {
    flexShrink: 0,
  },
  title: {
    fontFamily: theme.fontFamilies.display.semibold,
    fontSize: 26,
    lineHeight: 32,
    color: theme.colors.text.primary,
  },
  subtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  skeletonList: {
    gap: theme.spacing.sm,
  },
  list: {
    gap: theme.spacing.sm,
  },
});
