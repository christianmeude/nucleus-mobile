import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './ui/Icon';
import { UserPlus, MessageSquareMore, CircleCheck, Bell } from 'lucide-react-native';
import { NotificationItem } from '../types/domain';
import { formatRelativeTime } from '../utils/format';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { Button } from './ui';
import { invitationsApi } from '../api/invitations';

type IconVisual = {
  icon: any;
  color: string;
  bg: string;
};

/** Tinted type icon, keyed off the notification `type` string. */
const visualForType = (type: string | undefined, c: Theme['colors']): IconVisual => {
  const t = (type || '').toLowerCase();
  if (t.includes('invit') || t.includes('co_author') || t.includes('coauthor')) {
    return {
      icon: UserPlus,
      color: c.brand.accent,
      bg: c.brand.accentSurface,
    };
  }
  if (
    t.includes('comment') ||
    t.includes('revision') ||
    t.includes('review') ||
    t.includes('reject') ||
    t.includes('feedback')
  ) {
    return {
      icon: MessageSquareMore,
      color: c.state.warning,
      bg: c.state.warningSurface,
    };
  }
  if (
    t.includes('publish') ||
    t.includes('approv') ||
    t.includes('accept') ||
    t.includes('status')
  ) {
    return {
      icon: CircleCheck,
      color: c.state.success,
      bg: c.state.successSurface,
    };
  }
  return {
    icon: Bell,
    color: c.text.muted,
    bg: c.surface.sunken,
  };
};

interface NotificationCardProps {
  notification: NotificationItem;
  onPress: () => void;
}

export const NotificationCard = ({ notification, onPress }: NotificationCardProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [resolved, setResolved] = useState(false);
  const unread = !notification.is_read && !resolved;
  const visual = visualForType(notification.type, theme.colors);
  const title = notification.title?.trim();
  const message = notification.message?.trim();
  const primaryText = title || message || 'Notification';
  const secondaryText = title && message && message !== title ? message : null;

  const isInvitation = notification.type === 'invitation' && notification.status === 'pending';
  const isRevision = notification.type?.toLowerCase().includes('revision');

  const handleAccept = async () => {
    if (!notification.token) return;
    setResolved(true); // optimistic
    try {
      await invitationsApi.accept(notification.token);
    } catch {
      setResolved(false); // revert on failure
    }
  };

  const handleDecline = async () => {
    if (!notification.token) return;
    setResolved(true); // optimistic
    try {
      await invitationsApi.decline(notification.token);
    } catch {
      setResolved(false); // revert on failure
    }
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title || message || 'Notification'}, ${unread ? 'unread' : 'read'}`}
      style={({ pressed }) => [
        styles.row,
        unread && styles.rowUnread,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: visual.bg }]}>
        <Icon icon={visual.icon} size={18} color={visual.color} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.text, unread && styles.textUnread]} numberOfLines={3}>
          {primaryText}
        </Text>
        {secondaryText ? (
          <Text style={styles.secondary} numberOfLines={2}>
            {secondaryText}
          </Text>
        ) : null}

        {isInvitation && !resolved && (
          <View style={styles.chipsRow}>
            <Button label="Accept" variant="primary" size="sm" onPress={handleAccept} />
            <Button label="Decline" variant="subtle" size="sm" onPress={handleDecline} />
          </View>
        )}

        {isRevision && (
          <View style={styles.chipsRow}>
            <Button label="View Paper" variant="primary" size="sm" onPress={onPress} />
          </View>
        )}

        <Text style={styles.time}>{formatRelativeTime(notification.created_at)}</Text>
      </View>
      {unread ? <View style={styles.dot} /> : null}
    </Pressable>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: t.spacing.md,
      paddingVertical: 13,
      paddingHorizontal: t.spacing.md,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
    },
    rowUnread: {
      backgroundColor: t.colors.brand.primarySurface,
    },
    rowPressed: {
      opacity: 0.7,
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: t.radii.md,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      flex: 1,
    },
    text: {
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 14,
      lineHeight: 20,
      color: t.colors.text.secondary,
    },
    textUnread: {
      fontFamily: t.fontFamilies.ui.medium,
      color: t.colors.text.primary,
    },
    secondary: {
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 13,
      lineHeight: 18,
      color: t.colors.text.muted,
      marginTop: 2,
    },
    time: {
      fontFamily: t.fontFamilies.ui.medium,
      fontSize: 12,
      color: t.colors.text.disabled,
      marginTop: 4,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brand.primary,
      marginTop: 6,
    },
    chipsRow: {
      flexDirection: 'row',
      gap: t.spacing.sm,
      marginTop: t.spacing.sm,
    },
    buttonWrapper: {
      alignSelf: 'flex-start',
    },
  });
