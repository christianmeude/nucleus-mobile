import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Chip, PressableScale, Screen } from '../../components/ui';
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
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [tab, setTab] = useState<ActivityTab>('notifications');

  return (
    <Screen gutter={0}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <PressableScale
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.brand.primary} />
          </PressableScale>
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
    </Screen>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.sm,
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
