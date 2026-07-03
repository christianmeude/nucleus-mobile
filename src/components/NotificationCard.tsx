import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationItem } from '../types/domain';
import { formatRelativeTime } from '../utils/format';
import { theme } from '../theme';

type IconVisual = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
};

/** Tinted type icon, keyed off the notification `type` string. */
const visualForType = (type?: string): IconVisual => {
  const t = (type || '').toLowerCase();
  if (t.includes('invit') || t.includes('co_author') || t.includes('coauthor')) {
    return {
      name: 'person-add-outline',
      color: theme.colors.brand.primary,
      bg: theme.colors.brand.primarySurface,
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
      name: 'chatbubble-ellipses-outline',
      color: theme.colors.state.warning,
      bg: theme.colors.state.warningSurface,
    };
  }
  if (
    t.includes('publish') ||
    t.includes('approv') ||
    t.includes('accept') ||
    t.includes('status')
  ) {
    return {
      name: 'checkmark-circle-outline',
      color: theme.colors.state.success,
      bg: theme.colors.state.successSurface,
    };
  }
  return {
    name: 'notifications-outline',
    color: theme.colors.text.muted,
    bg: theme.colors.surface.sunken,
  };
};

interface NotificationCardProps {
  notification: NotificationItem;
  onPress: () => void;
}

export const NotificationCard = ({ notification, onPress }: NotificationCardProps) => {
  const unread = !notification.is_read;
  const visual = visualForType(notification.type);
  const title = notification.title?.trim();
  const message = notification.message?.trim();
  const primaryText = title || message || 'Notification';
  const secondaryText = title && message && message !== title ? message : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title || message || 'Notification'}, ${unread ? 'unread' : 'read'}`}
      style={({ pressed }) => [styles.row, unread && styles.rowUnread, pressed && styles.rowPressed]}
    >
      <View style={[styles.icon, { backgroundColor: visual.bg }]}>
        <Ionicons name={visual.name} size={18} color={visual.color} />
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
        <Text style={styles.time}>{formatRelativeTime(notification.created_at)}</Text>
      </View>
      {unread ? <View style={styles.dot} /> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.lg,
    paddingVertical: 16,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.xl,
    borderCurve: 'continuous',
  },
  rowUnread: {
    backgroundColor: theme.colors.brand.primarySurface,
  },
  rowPressed: {
    opacity: 0.7,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  text: {
    fontFamily: theme.fontFamilies.ui.regular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text.secondary,
  },
  textUnread: {
    fontFamily: theme.fontFamilies.ui.medium,
    color: theme.colors.text.primary,
  },
  secondary: {
    fontFamily: theme.fontFamilies.ui.regular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.text.muted,
    marginTop: 2,
  },
  time: {
    fontFamily: theme.fontFamilies.ui.medium,
    fontSize: 12,
    color: theme.colors.text.disabled,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.brand.primary,
    marginTop: 6,
  },
});
