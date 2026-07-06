import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { invitationsApi } from '../api/invitations';
import { CoAuthorInvitation } from '../types/domain';
import { InvitationCard } from './InvitationCard';
import { ListEntranceItem } from './ListEntranceItem';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { EmptyState, InlineNotice, Skeleton } from './ui';

const isExpired = (invitation: CoAuthorInvitation) => {
  if (!invitation.expires_at) return false;
  return new Date(invitation.expires_at).getTime() < Date.now();
};

/**
 * Co-author invitations feed — the body extracted from the retired
 * InvitationsScreen, now hosted inside the merged Activity screen's "Invites"
 * segment. Owns its own fetch and accept/decline actions.
 */
export const InvitationsList = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [invitations, setInvitations] = useState<CoAuthorInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingToken, setActingToken] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const payload = await invitationsApi.getMine();
      setInvitations(payload.invitations || []);
      setError('');
    } catch (_error) {
      setError('Failed to load invitations.');
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

  const runAction = async (token: string, action: 'accept' | 'decline') => {
    setActingToken(token);
    setError('');

    try {
      if (action === 'accept') {
        await invitationsApi.accept(token);
      } else {
        await invitationsApi.decline(token);
      }

      await loadData(true);
    } catch (_error) {
      setError(`Failed to ${action} invitation.`);
    } finally {
      setActingToken('');
    }
  };

  return (
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
      {error ? <InlineNotice tone="danger" message={error} /> : null}

      {loading ? (
        <View style={styles.skeletonList}>
          <Skeleton height={132} />
          <Skeleton height={132} />
          <Skeleton height={132} />
        </View>
      ) : invitations.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="mail-open-outline" size={24} color={theme.colors.text.muted} />}
          title="No invitations available"
          message="Co-author invitations you receive will appear here."
        />
      ) : (
        <View style={styles.list}>
          {invitations.map((invitation, index) => {
            const calendarExpired = invitation.status === 'pending' && isExpired(invitation);
            const cardInvitation: CoAuthorInvitation = calendarExpired
              ? { ...invitation, status: 'expired' }
              : invitation;
            const canAct = invitation.status === 'pending' && !calendarExpired;

            return (
              <ListEntranceItem key={invitation.id} index={index}>
                <InvitationCard
                  invitation={cardInvitation}
                  acting={actingToken === invitation.token}
                  onAccept={canAct ? () => runAction(invitation.token, 'accept') : undefined}
                  onDecline={canAct ? () => runAction(invitation.token, 'decline') : undefined}
                />
              </ListEntranceItem>
            );
          })}
        </View>
      )}
    </ScrollView>
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
      paddingBottom: t.spacing['3xl'],
      gap: t.spacing.sm,
    },
    skeletonList: {
      gap: t.spacing.sm,
    },
    list: {
      gap: t.spacing.sm,
    },
  });
