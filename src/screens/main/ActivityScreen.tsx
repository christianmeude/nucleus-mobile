import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Chip } from '../../components/ui';
import { NotificationsList } from '../../components/NotificationsList';
import { InvitationsList } from '../../components/InvitationsList';

type ActivityTab = 'notifications' | 'invites';

/**
 * Merged inbox reached from the TopBar bell. A segmented control switches
 * between the Notifications and Invites feeds (their bodies extracted into
 * reusable list components); pushed over the tab bar as a focused stack screen.
 */
export const ActivityScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [tab, setTab] = useState<ActivityTab>('notifications');

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.sm }]}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.brand.primary} />
          </Pressable>
          <Text style={styles.title}>Activity</Text>
          <View style={styles.backSpacer} />
        </View>

        <View style={styles.segmented}>
          <Chip
            label="Notifications"
            variant="filter"
            active={tab === 'notifications'}
            onPress={() => setTab('notifications')}
          />
          <Chip
            label="Invites"
            variant="filter"
            active={tab === 'invites'}
            onPress={() => setTab('invites')}
          />
        </View>
      </View>

      {tab === 'notifications' ? <NotificationsList /> : <InvitationsList />}
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.surface.base,
    },
    header: {
      paddingHorizontal: t.spacing.lg,
      paddingBottom: t.spacing.sm,
      gap: t.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.colors.border.subtle,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    back: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -t.spacing.sm,
    },
    backPressed: {
      opacity: 0.6,
    },
    backSpacer: {
      width: 44,
      height: 44,
    },
    title: {
      fontFamily: t.fontFamilies.display.semibold,
      fontSize: 20,
      color: t.colors.text.primary,
    },
    segmented: {
      flexDirection: 'row',
      gap: t.spacing.sm,
    },
  });
