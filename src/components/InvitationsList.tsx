import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, View, Text } from 'react-native';
import { LegendList } from '@legendapp/list/react-native';
import Animated from 'react-native-reanimated';
import { Icon } from './ui/Icon';
import { MailOpen } from 'lucide-react-native';
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


export const InvitationsList = ({ onScroll }: { onScroll?: any }) => {
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

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    <LegendList
      onScroll={onScroll}
      scrollEventThrottle={16}
      recycleItems={false}
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
      ListHeaderComponent={() => (
        <View style={styles.header}>
          <Text style={styles.title}>Invitations</Text>
          <Text style={styles.subtitle}>
            You have been invited to participate in the following research projects.
          </Text>

          {error ? <InlineNotice tone="danger" message={error} /> : null}

          {loading ? (
            <View style={styles.skeletonList}>
              <Skeleton height={132} />
              <Skeleton height={132} />
              <Skeleton height={132} />
            </View>
          ) : invitations.length === 0 ? (
            <EmptyState
              context="default"
              title="No invitations available"
              message="Co-author invitations you receive will appear here."
            />
          ) : null}
        </View>
      )}
      data={loading || invitations.length === 0 ? ([] as CoAuthorInvitation[]) : invitations}
      keyExtractor={(item: any) => item.id}
      estimatedItemSize={132}
      renderItem={({ item: rawItem, index }) => {
        const item = rawItem as CoAuthorInvitation;
        const calendarExpired = item.status === 'pending' && isExpired(item);
        const cardInvitation: CoAuthorInvitation = calendarExpired
          ? { ...item, status: 'expired' }
          : item;
        const canAct = item.status === 'pending' && !calendarExpired;

        return (
          <ListEntranceItem key={item.id} index={index}>
            <InvitationCard
              invitation={cardInvitation}
              acting={actingToken === item.token}
              onAccept={canAct ? () => runAction(item.token, 'accept') : undefined}
              onDecline={canAct ? () => runAction(item.token, 'decline') : undefined}
            />
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
      paddingTop: t.spacing.md,
      paddingBottom: t.spacing['3xl'] + 120,
      gap: t.spacing.md,
    },
    header: {
      gap: t.spacing.sm,
    },
    title: {
      ...t.typography.h3,
      color: t.colors.text.primary,
    },
    subtitle: {
      ...t.typography.bodySmall,
      color: t.colors.text.muted,
      marginBottom: t.spacing.sm,
    },
    skeletonList: {
      gap: t.spacing.sm,
    },
    list: {
      gap: t.spacing.sm,
    },
  });
