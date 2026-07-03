import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CoAuthorInvitation } from '../types/domain';
import { formatDate, statusToLabel } from '../utils/format';
import { theme } from '../theme';

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

const pillToneForStatus = (status: string): { bg: string; color: string } => {
  switch (status) {
    case 'pending':
      return { bg: theme.colors.state.warningSurface, color: theme.colors.state.warning };
    case 'accepted':
      return { bg: theme.colors.state.successSurface, color: theme.colors.state.success };
    case 'declined':
      return { bg: theme.colors.state.dangerSurface, color: theme.colors.state.danger };
    default:
      return { bg: theme.colors.surface.sunken, color: theme.colors.text.muted };
  }
};

interface InvitationCardProps {
  invitation: CoAuthorInvitation;
  acting?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
}

export const InvitationCard = ({
  invitation,
  acting = false,
  onAccept,
  onDecline,
}: InvitationCardProps) => {
  const status = String(invitation.status);
  const isPending = status === 'pending';
  const isExpired = status === 'expired';
  const notActionable = !isPending;
  const showActions = isPending || isExpired;
  const pressDisabled = notActionable || acting;

  const inviterName =
    invitation.inviter?.fullName ||
    invitation.inviter?.name ||
    invitation.inviter?.email ||
    'Unknown';
  const researchTitle = invitation.research?.title || 'Untitled Research';
  const pill = pillToneForStatus(status);

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
            {acting ? (
              <ActivityIndicator size="small" color={theme.colors.text.onBrand} />
            ) : null}
            <Text style={[styles.acceptText, notActionable && styles.acceptTextDisabled]}>
              {acting ? 'Accepting' : 'Accept'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radii.xl,
    borderCurve: 'continuous',
    padding: theme.spacing.xl,
  },
  cardMuted: {
    backgroundColor: theme.colors.surface.base,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  inviterRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: theme.radii.pill,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMuted: {
    backgroundColor: theme.colors.border.strong,
  },
  avatarText: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 13,
    color: theme.colors.text.onBrand,
  },
  avatarTextMuted: {
    color: theme.colors.text.muted,
  },
  inviterText: {
    flex: 1,
  },
  inviterName: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  subline: {
    fontFamily: theme.fontFamilies.ui.regular,
    fontSize: 12,
    color: theme.colors.text.disabled,
    marginTop: 1,
  },
  textMuted: {
    color: theme.colors.text.muted,
  },
  pill: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 11,
  },
  title: {
    fontFamily: theme.fontFamilies.display.semibold,
    fontSize: 19,
    lineHeight: 25,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
  },
  expiry: {
    fontFamily: theme.fontFamilies.ui.medium,
    fontSize: 12,
    color: theme.colors.text.disabled,
    marginTop: theme.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  decline: {
    fontFamily: theme.fontFamilies.ui.medium,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  declineDisabled: {
    color: theme.colors.text.disabled,
  },
  accept: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.brand.primary,
    borderRadius: theme.radii.pill,
    borderCurve: 'continuous',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 9,
  },
  acceptLoading: {
    backgroundColor: theme.colors.brand.primaryHover,
  },
  acceptDisabled: {
    backgroundColor: theme.colors.border.subtle,
  },
  acceptPressed: {
    opacity: 0.85,
  },
  acceptText: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 14,
    color: theme.colors.text.onBrand,
  },
  acceptTextDisabled: {
    color: theme.colors.text.disabled,
  },
});
