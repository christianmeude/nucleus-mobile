import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemedStyles, useTheme } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { CheckCircle, SearchX, FileX, BellOff, Info } from 'lucide-react-native';

export type EmptyStateContext = 'all-caught-up' | 'no-results' | 'no-papers' | 'no-notifications' | 'default';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  context?: EmptyStateContext;
}

const CONTEXT_DEFAULTS = {
  'all-caught-up': {
    title: 'All caught up!',
    message: 'There are no pending items for you to review.',
    IconComponent: CheckCircle,
  },
  'no-results': {
    title: 'No results found',
    message: 'Try a different search or filter.',
    IconComponent: SearchX,
  },
  'no-papers': {
    title: 'No papers yet',
    message: 'You have not submitted any papers.',
    IconComponent: FileX,
  },
  'no-notifications': {
    title: 'No notifications',
    message: "You'll hear from us when something happens.",
    IconComponent: BellOff,
  },
  'default': {
    title: 'Nothing here',
    message: 'There is nothing to show at this time.',
    IconComponent: Info,
  },
} as const;

export const EmptyState = ({ title, message, icon, context }: EmptyStateProps) => {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();

  const ctx = context ? CONTEXT_DEFAULTS[context] : null;
  const defaultCtx = CONTEXT_DEFAULTS['default'];

  const displayTitle = title ?? ctx?.title ?? defaultCtx.title;
  const displayMessage = message ?? ctx?.message;
  
  let displayIcon = icon;
  if (!displayIcon && context) {
    const IconComp = ctx?.IconComponent ?? defaultCtx.IconComponent;
    displayIcon = <IconComp size={40} color={theme.colors.brand.primary} />;
  }

  return (
    <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.container}>
      {displayIcon ? (
        <View style={context ? styles.iconCircle : styles.icon}>
          {displayIcon}
        </View>
      ) : null}
      <Text style={styles.title}>{displayTitle}</Text>
      {displayMessage ? <Text style={styles.message}>{displayMessage}</Text> : null}
    </Animated.View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: t.spacing['2xl'],
      paddingHorizontal: t.spacing.lg,
      gap: t.spacing.sm,
    },
    icon: {
      marginBottom: t.spacing.xs,
    },
    iconCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: t.colors.brand.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: t.spacing.sm,
    },
    title: {
      ...t.typography.h3,
      color: t.colors.text.primary,
      textAlign: 'center',
    },
    message: {
      ...t.typography.bodySmall,
      color: t.colors.text.muted,
      textAlign: 'center',
    },
  });
