import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CoAuthorInvitation } from '../types/domain';
import { formatDate, statusToLabel } from '../utils/format';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';

const DAY_MS = 24 * 60 * 60 * 1000;

const initialsFor = (name: string) => {
  const trimmed = name.trim().replace(/^(dr\.?|prof\.?|engr\.?)\s+/i, '');
  if (!trimmed || trimmed.toLowerCase() === 'unknown') return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const statusLabelForStatus = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'accepted':
      return 'Accepted';
    case 'declined':
      return 'Declined';
    case 'expired':
      return 'Expired';
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
  }
};

const pillToneForStatus = (status: string, c: Theme['colors']): { bg: string; color: string } => {
  switch (status) {
    case 'pending':
      return { bg: c.state.warningSurface, color: c.state.warning };
    case 'accepted':
      return { bg: c.state.successSurface, color: c.state.success };
    case 'declined':
      return { bg: c.state.dangerSurface, color: c.state.danger };
    default:
      return { bg: c.surface.sunken, color: c.text.muted };
  }
};

interface InvitationCardProps {
  invitation: CoAuthorInvitation;
  acting?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
}

export const InvitationCard = memo(
  ({ invitation, acting = false, onAccept, onDecline }: InvitationCardProps) => {
    const { theme } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const status = String(invitation.status);
    const isPending = status === 'pending';
    const isExpired = status === 'expired';
    const notActionable = !isPending;
    // Only pending invitations are actionable. Expired/accepted/declined
    // render no actions at all (no reserved spacing).
    const showActions = isPending;
    const pressDisabled = notActionable || acting;

    const inviterName =
      invitation.inviter?.fullName ||
      invitation.inviter?.name ||
      invitation.inviter?.email ||
      'Unknown';
    const researchTitle = invitation.research?.title || 'Untitled Research';
    const pill = pillToneForStatus(status, theme.colors);

    const subline = isExpired
      ? `Expired ${formatDate(invitation.expires_at)}`
      : invitation.created_at
        ? `Invited ${formatDate(invitation.created_at)}`
        : invitation.inviter?.email || '';

    const expiryText = (() => {
      if (!isPending || !invitation.expires_at) return null;
      const ms = new Date(invitation.expires_at).getTime() - Date.now();
      if (Number.isNaN(ms)) return null;
      const days = Math.ceil(ms / DAY_MS);
      if (days <= 0) return 'Expires today';
      return `Expires in ${days} day${days === 1 ? '' : 's'}`;
    })();

    return (
      <View
        style={[styles.card, isExpired && styles.cardMuted]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${researchTitle}, invitation ${statusToLabel(invitation.status)}`}
      >
        <View style={styles.head}>
          <View style={styles.inviterRow}>
            <View style={[styles.avatar, isExpired && styles.avatarMuted]}>
              <Text style={[styles.avatarText, isExpired && styles.avatarTextMuted]}>
                {initialsFor(inviterName)}
              </Text>
            </View>
            <View style={styles.inviterText}>
              <Text style={[styles.inviterName, isExpired && styles.textMuted]} numberOfLines={1}>
                {inviterName}
              </Text>
              {subline ? (
                <Text style={styles.subline} numberOfLines={1}>
                  {subline}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={[styles.pill, { backgroundColor: pill.bg }]}>
            <Text style={[styles.pillText, { color: pill.color }]}>
              {statusLabelForStatus(status)}
            </Text>
          </View>
        </View>

        <Text style={[styles.title, isExpired && styles.textMuted]} numberOfLines={3}>
          {researchTitle}
        </Text>
        {expiryText ? <Text style={styles.expiry}>{expiryText}</Text> : null}

        {showActions ? (
          <View style={styles.actions}>
            <Pressable
              onPress={isPending ? onDecline : undefined}
              disabled={pressDisabled}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Decline invitation"
            >
              <Text style={[styles.decline, notActionable && styles.declineDisabled]}>Decline</Text>
            </Pressable>
            <Pressable
              onPress={isPending ? onAccept : undefined}
              disabled={pressDisabled}
              style={({ pressed }) => [
                styles.accept,
                notActionable && styles.acceptDisabled,
                acting && styles.acceptLoading,
                pressed && !pressDisabled && styles.acceptPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Accept invitation"
            >
              {acting ? <ActivityIndicator size="small" color={theme.colors.text.onBrand} /> : null}
              <Text style={[styles.acceptText, notActionable && styles.acceptTextDisabled]}>
                {acting ? 'Accepting' : 'Accept'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  },
);

InvitationCard.displayName = 'InvitationCard';

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.colors.surface.raised,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      padding: t.spacing.lg,
    },
    cardMuted: {
      backgroundColor: t.colors.surface.base,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.spacing.sm,
    },
    inviterRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
      backgroundColor: t.colors.brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarMuted: {
      backgroundColor: t.colors.border.strong,
    },
    avatarText: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 13,
      color: t.colors.text.onBrand,
    },
    avatarTextMuted: {
      color: t.colors.text.muted,
    },
    inviterText: {
      flex: 1,
    },
    inviterName: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 14,
      color: t.colors.text.primary,
    },
    subline: {
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 12,
      color: t.colors.text.disabled,
      marginTop: 1,
    },
    textMuted: {
      color: t.colors.text.muted,
    },
    pill: {
      borderRadius: t.radii.pill,
      paddingHorizontal: t.spacing.sm,
      paddingVertical: 3,
    },
    pillText: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 11,
    },
    title: {
      fontFamily: t.fontFamilies.display.semibold,
      fontSize: 17,
      lineHeight: 22,
      color: t.colors.text.primary,
      marginTop: t.spacing.md,
    },
    expiry: {
      fontFamily: t.fontFamilies.ui.medium,
      fontSize: 12,
      color: t.colors.text.disabled,
      marginTop: t.spacing.sm,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: t.spacing.lg,
      marginTop: t.spacing.lg,
    },
    decline: {
      fontFamily: t.fontFamilies.ui.medium,
      fontSize: 14,
      color: t.colors.text.secondary,
    },
    declineDisabled: {
      color: t.colors.text.disabled,
    },
    accept: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
      backgroundColor: t.colors.brand.primary,
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
      paddingHorizontal: t.spacing.xl,
      paddingVertical: 9,
    },
    acceptLoading: {
      backgroundColor: t.colors.brand.primaryHover,
    },
    acceptDisabled: {
      backgroundColor: t.colors.border.subtle,
    },
    acceptPressed: {
      opacity: 0.85,
    },
    acceptText: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 14,
      color: t.colors.text.onBrand,
    },
    acceptTextDisabled: {
      color: t.colors.text.disabled,
    },
  });
