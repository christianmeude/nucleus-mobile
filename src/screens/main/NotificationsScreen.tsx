import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { notificationsApi } from '../../api/notifications';
import { NotificationItem } from '../../types/domain';
import { NotificationCard } from '../../components/NotificationCard';
import { ListEntranceItem } from '../../components/ListEntranceItem';
import { theme } from '../../theme';
import { EmptyState, InlineNotice, Skeleton } from '../../components/ui';

const DAY_MS = 24 * 60 * 60 * 1000;

export const NotificationsScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
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
      const rows = await notificationsApi.getMine(100);
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

  const groups = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 6 * DAY_MS;
    const today: NotificationItem[] = [];
    const week: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    notifications.forEach((item) => {
      const time = new Date(item.created_at).getTime();
      if (Number.isNaN(time) || time < weekStart) earlier.push(item);
      else if (time >= todayStart) today.push(item);
      else week.push(item);
    });

    return [
      { key: 'today', title: 'Today', items: today },
      { key: 'week', title: 'This week', items: week },
      { key: 'earlier', title: 'Earlier', items: earlier },
    ].filter((group) => group.items.length > 0);
  }, [notifications]);

  const openNotification = async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        await notificationsApi.markRead(item.id);
      } catch {
        // Keep navigation usable if read-state update fails.
      }

      setNotifications((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, is_read: true } : entry))
      );
    }

    if (item.research_id) {
      navigation.navigate('ResearchDetail', { paperId: item.research_id });
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((entry) => ({ ...entry, is_read: true })));
    } catch {
      setError('Unable to mark all notifications as read.');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          tintColor={theme.colors.brand.primary}
          colors={[theme.colors.brand.primary]}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Notifications</Text>
          <Pressable
            onPress={markAllAsRead}
            disabled={unreadCount === 0}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            hitSlop={8}
          >
            <Text style={[styles.markAll, unreadCount === 0 && styles.markAllDisabled]}>
              Mark all read
            </Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          {unreadCount > 0 ? `${unreadCount} unread` : 'You’re all caught up'}
        </Text>
      </View>

      {error ? <InlineNotice tone="danger" message={error} /> : null}

      {loading ? (
        <View style={styles.skeletonList}>
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={
            <Ionicons name="notifications-outline" size={24} color={theme.colors.text.muted} />
          }
          title="No notifications yet"
          message="Updates on your papers and activity will appear here."
        />
      ) : (
        groups.map((group) => (
          <View key={group.key} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.items.map((item, index) => (
              <ListEntranceItem key={item.id} index={index}>
                <NotificationCard notification={item} onPress={() => openNotification(item)} />
              </ListEntranceItem>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface.base,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['3xl'],
    gap: theme.spacing.md,
  },
  header: {
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  title: {
    fontFamily: theme.fontFamilies.display.semibold,
    fontSize: 26,
    lineHeight: 32,
    color: theme.colors.text.primary,
  },
  markAll: {
    fontFamily: theme.fontFamilies.ui.medium,
    fontSize: 13,
    color: theme.colors.brand.primary,
  },
  markAllDisabled: {
    color: theme.colors.text.disabled,
  },
  subtitle: {
    fontFamily: theme.fontFamilies.ui.regular,
    fontSize: 13,
    color: theme.colors.text.muted,
  },
  skeletonList: {
    gap: theme.spacing.sm,
  },
  group: {
    gap: theme.spacing.xs,
  },
  groupTitle: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: theme.colors.text.disabled,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
});
