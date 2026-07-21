import { useCallback, useMemo, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SectionList as LegendSectionList } from '@legendapp/list/section-list';
import Animated from 'react-native-reanimated';
import { Icon } from './ui/Icon';
import { Bell } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { notificationsApi } from '../api/notifications';
import { facultyApi } from '../api/faculty';
import { useAuth } from '../context/AuthContext';
import { NotificationItem, CoAuthorInvitation } from '../types/domain';
import { NotificationCard } from './NotificationCard';
import { ListEntranceItem } from './ListEntranceItem';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { EmptyState, InlineNotice, Skeleton } from './ui';
import { invitationsApi } from '../api/invitations';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Notifications feed — the body extracted from the retired NotificationsScreen,
 * now hosted inside the merged Activity screen's "Notifications" segment and
 * shared by both roles. It selects its data source by role: students read the
 * student notifications API (taps open the student research detail); faculty
 * read the faculty notifications API (taps open the faculty review detail),
 * folding in the retired FacultyNotificationsScreen. Owns its own fetch,
 * grouping, and read-state actions.
 */

export const NotificationsList = ({ onScroll }: { onScroll?: any }) => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const isFaculty = user?.role === 'faculty';

  // One adapter over the two role-specific notification facades. Both return the
  // shared `NotificationItem` shape; only the method names, and the detail route
  // a notification opens, differ.
  const source = useMemo(
    () =>
      isFaculty
        ? {
            getMine: (limit: number) => facultyApi.getNotifications(limit),
            markRead: (id: string) => facultyApi.markNotificationRead(id),
            markAllRead: () => facultyApi.markAllNotificationsRead(),
            detailRoute: 'FacultyReviewDetail' as const,
          }
        : {
            getMine: (limit: number) => notificationsApi.getMine(limit),
            markRead: (id: string) => notificationsApi.markRead(id),
            markAllRead: () => notificationsApi.markAllRead(),
            detailRoute: 'ResearchDetail' as const,
          },
    [isFaculty],
  );

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const [rows, invitesPayload] = await Promise.all([
          source.getMine(100),
          !isFaculty
            ? invitationsApi.getMine()
            : Promise.resolve({ invitations: [], pendingCount: 0 }),
        ]);

        const invitesAsNotifications: NotificationItem[] = invitesPayload.invitations.map(
          (inv: CoAuthorInvitation) => ({
            id: inv.id,
            user_id: inv.invitee_id,
            research_id: inv.research_id,
            type: 'invitation',
            title: 'Co-author Invitation',
            message: `${inv.inviter?.fullName || 'Someone'} invited you to collaborate on "${inv.research?.title || 'a paper'}".`,
            is_read: inv.status !== 'pending',
            created_at: inv.created_at || new Date().toISOString(),
            token: inv.token,
            status: inv.status,
          }),
        );

        // Combine and sort descending by created_at
        const combined = [...rows, ...invitesAsNotifications].sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setNotifications(combined);
        setError('');
      } catch (_error) {
        setError('Failed to load notifications.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [source, isFaculty],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
  );

  const groups = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const today: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    notifications.forEach((item) => {
      const time = new Date(item.created_at).getTime();
      if (Number.isNaN(time) || time < todayStart) earlier.push(item);
      else today.push(item);
    });

    return [
      { key: 'today', title: 'Today', data: today },
      { key: 'earlier', title: 'Earlier', data: earlier },
    ].filter((group) => group.data.length > 0);
  }, [notifications]);

  const openNotification = async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        await source.markRead(item.id);
      } catch {
        // Keep navigation usable if read-state update fails.
      }

      setNotifications((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, is_read: true } : entry)),
      );
    }

    if (item.research_id) {
      navigation.navigate(source.detailRoute, { paperId: item.research_id });
    }
  };

  const markAllAsRead = async () => {
    try {
      await source.markAllRead();
      setNotifications((prev) => prev.map((entry) => ({ ...entry, is_read: true })));
    } catch {
      setError('Unable to mark all notifications as read.');
    }
  };

  return (
    <LegendSectionList
      onScroll={onScroll}
      scrollEventThrottle={16}
      recycleItems={false}
      stickySectionHeadersEnabled={true}
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
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.subheader}>
            <Text style={styles.subtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'You’re all caught up'}
            </Text>
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

          {error ? <InlineNotice tone="danger" message={error} /> : null}

          {loading ? (
            <View style={styles.skeletonList}>
              <Skeleton height={72} />
              <Skeleton height={72} />
              <Skeleton height={72} />
            </View>
          ) : notifications.length === 0 ? (
            <EmptyState context="no-notifications" />
          ) : null}
        </View>
      }
      sections={loading || notifications.length === 0 ? ([] as typeof groups) : groups}
      keyExtractor={(item: any) => item.id}
      estimatedItemSize={72}
      renderSectionHeader={({ section }) => (
        <Text style={styles.groupTitle}>{(section as any).title}</Text>
      )}
      renderItem={({ item: rawItem, index }) => {
        const item = rawItem as NotificationItem;
        return (
          <ListEntranceItem key={item.id} index={index}>
            <NotificationCard notification={item} onPress={() => openNotification(item)} />
          </ListEntranceItem>
        );
      }}
    />
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.md,
      paddingBottom: t.spacing['3xl'] + 120,
      gap: t.spacing.md,
    },
    header: {
      gap: t.spacing.md,
    },
    subheader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.spacing.sm,
    },
    subtitle: {
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 13,
      color: t.colors.text.muted,
    },
    markAll: {
      fontFamily: t.fontFamilies.ui.medium,
      fontSize: 13,
      color: t.colors.brand.primary,
    },
    markAllDisabled: {
      color: t.colors.text.disabled,
    },
    skeletonList: {
      gap: t.spacing.sm,
    },
    group: {
      gap: t.spacing.xs,
    },
    groupTitle: {
      ...t.typography.label,
      color: t.colors.text.muted,
      marginTop: t.spacing.sm,
      marginBottom: t.spacing.xs,
      paddingHorizontal: t.spacing.sm,
    },
  });
