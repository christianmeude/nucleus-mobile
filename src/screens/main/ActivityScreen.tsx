import { useState, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/ui/Icon';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Chip, PressableScale, Screen, TopBar } from '../../components/ui';
import { NotificationsList } from '../../components/NotificationsList';
import { InvitationsList } from '../../components/InvitationsList';

type ActivityTab = 'notifications' | 'invites';

/**
 * Merged inbox reached from the TopBar bell. For students a segmented control
 * switches between the Notifications and Invites feeds (their bodies extracted
 * into reusable list components). Faculty have no co-author invitations concept,
 * so they see the Notifications feed alone — no segmented control. Pushed over
 * the tab bar as a focused stack screen for both roles.
 */
export const ActivityScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [tab, setTab] = useState<ActivityTab>('notifications');

  const isFaculty = user?.role === 'faculty';

  const scrollOffset = useSharedValue(0);
  const scrollHandler = useCallback((event: any) => {
    scrollOffset.value = event.nativeEvent.contentOffset.y;
  }, [scrollOffset]);

  return (
    <Screen gutter={0}>
      <View style={styles.header}>
        <TopBar
          title="Activity"
          variant="large"
          scrollOffset={scrollOffset}
          hideBell
          leftAccessory={
            <PressableScale
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={12}
              style={styles.back}
            >
              <Icon icon={ChevronLeft} size={24} color={theme.colors.text.primary} />
            </PressableScale>
          }
        />

        {isFaculty ? null : (
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
        )}
      </View>

      {isFaculty || tab === 'notifications' ? (
        <NotificationsList onScroll={scrollHandler} />
      ) : (
        <InvitationsList onScroll={scrollHandler} />
      )}
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
    back: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -t.spacing.sm,
    },
    segmented: {
      flexDirection: 'row',
      gap: t.spacing.sm,
    },
  });
