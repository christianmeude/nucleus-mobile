import { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { invitationsApi } from '../../api/invitations';
import { CoAuthorInvitation } from '../../types/domain';
import { InvitationCard } from '../../components/InvitationCard';
import { ListEntranceItem } from '../../components/ListEntranceItem';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { EmptyState, InlineNotice, Skeleton } from '../../components/ui';

export const InvitationsScreen = () => {
  const insets = useSafeAreaInsets();
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

  const counts = useMemo(() => {
    return invitations.reduce(
      (acc, invitation) => {
        const status = invitation.status;
        if (status === 'pending') acc.pending += 1;
        if (status === 'accepted') acc.accepted += 1;
        if (status === 'declined' || status === 'expired') acc.closed += 1;
        return acc;
      },
      { pending: 0, accepted: 0, closed: 0 }
    );
  }, [invitations]);

  const isExpired = (invitation: CoAuthorInvitation) => {
    if (!invitation.expires_at) return false;
    return new Date(invitation.expires_at).getTime() < Date.now();
  };

  const pendingSubtitle = useMemo(() => {
    const n = invitations.filter(
      (inv) => inv.status === 'pending' && !isExpired(inv)
    ).length;
    if (n === 1) return '1 pending invitation';
    if (n > 1) return `${n} pending invitations`;
    return 'No pending invitations';
  }, [invitations]);

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
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Invitations</Text>
        <Text style={styles.subtitle}>{pendingSubtitle}</Text>
      </View>

      {error ? <InlineNotice tone="danger" message={error} /> : null}

      {loading ? (
        <View style={styles.skeletonList}>
          <Skeleton height={132} />
          <Skeleton height={132} />
          <Skeleton height={132} />
        </View>
      ) : invitations.length === 0 ? (
        <EmptyState
          icon={
            <Ionicons
              name="mail-open-outline"
              size={24}
              color={theme.colors.text.muted}
            />
          }
          title="No invitations available"
          message="Co-author invitations you receive will appear here."
        />
      ) : (
        <View style={styles.list}>
          {invitations.map((invitation, index) => {
            const calendarExpired =
              invitation.status === 'pending' && isExpired(invitation);
            const cardInvitation: CoAuthorInvitation = calendarExpired
              ? { ...invitation, status: 'expired' }
              : invitation;
            const canAct =
              invitation.status === 'pending' && !calendarExpired;

            return (
              <ListEntranceItem key={invitation.id} index={index}>
                <InvitationCard
                  invitation={cardInvitation}
                  acting={actingToken === invitation.token}
                  onAccept={
                    canAct ? () => runAction(invitation.token, 'accept') : undefined
                  }
                  onDecline={
                    canAct ? () => runAction(invitation.token, 'decline') : undefined
                  }
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
      backgroundColor: t.colors.surface.base,
    },
    content: {
      paddingHorizontal: t.spacing.lg,
      paddingBottom: t.spacing['3xl'],
      gap: t.spacing.lg,
    },
    headerBlock: {
      gap: 0,
    },
    title: {
      fontFamily: t.fontFamilies.display.semibold,
      fontSize: 26,
      lineHeight: 32,
      color: t.colors.text.primary,
    },
    subtitle: {
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 13,
      color: t.colors.text.muted,
      marginTop: 2,
    },
    skeletonList: {
      gap: t.spacing.sm,
    },
    list: {
      gap: t.spacing.sm,
    },
  });
