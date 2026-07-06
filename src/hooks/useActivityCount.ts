import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { notificationsApi } from '../api/notifications';
import { invitationsApi } from '../api/invitations';

/**
 * Combined badge count for the TopBar bell: unread notifications + pending
 * co-author invitations. Refetched whenever the hosting screen regains focus.
 * Failures fall back to 0 for that source rather than surfacing an error — a
 * badge is ambient, not a blocking read.
 */
export function useActivityCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const [unreadResult, invitesResult] = await Promise.allSettled([
      notificationsApi.getUnreadCount(),
      invitationsApi.getMine(),
    ]);

    const unread = unreadResult.status === 'fulfilled' ? unreadResult.value : 0;
    const pending =
      invitesResult.status === 'fulfilled' ? invitesResult.value.pendingCount : 0;

    setCount(unread + pending);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return count;
}
