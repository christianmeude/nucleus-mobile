import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { notificationsApi } from '../api/notifications';
import { invitationsApi } from '../api/invitations';
import { facultyApi } from '../api/faculty';
import { useAuth } from '../context/AuthContext';

/**
 * Badge count for the TopBar bell. Students get unread notifications + pending
 * co-author invitations combined; faculty have no invitations concept, so they
 * get unread notifications only (counted from the faculty notifications feed,
 * which has no dedicated count endpoint). Refetched whenever the hosting screen
 * regains focus. Failures fall back to 0 for that source rather than surfacing
 * an error — a badge is ambient, not a blocking read.
 */
export function useActivityCount(): number {
  const { user } = useAuth();
  const isFaculty = user?.role === 'faculty';
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (isFaculty) {
      try {
        const rows = await facultyApi.getNotifications(100);
        setCount(rows.filter((row) => !row.is_read).length);
      } catch {
        setCount(0);
      }
      return;
    }

    const [unreadResult, invitesResult] = await Promise.allSettled([
      notificationsApi.getUnreadCount(),
      invitationsApi.getMine(),
    ]);

    const unread = unreadResult.status === 'fulfilled' ? unreadResult.value : 0;
    const pending =
      invitesResult.status === 'fulfilled' ? invitesResult.value.pendingCount : 0;

    setCount(unread + pending);
  }, [isFaculty]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return count;
}
