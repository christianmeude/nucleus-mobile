import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { FacultyTabsParamList } from './types';
import { FacultyDashboardScreen } from '../screens/faculty/FacultyDashboardScreen';
import { FacultyReviewScreen } from '../screens/faculty/FacultyReviewScreen';
import { FacultyRepositoryScreen } from '../screens/faculty/FacultyRepositoryScreen';
import { FacultyNotificationsScreen } from '../screens/faculty/FacultyNotificationsScreen';
import { FacultyProfileScreen } from '../screens/faculty/FacultyProfileScreen';
import { theme } from '../theme';

const Tabs = createBottomTabNavigator<FacultyTabsParamList>();

const tabIcons: Record<keyof FacultyTabsParamList, keyof typeof Ionicons.glyphMap> = {
  FacultyDashboard: 'speedometer-outline',
  FacultyReview: 'document-text-outline',
  FacultyRepository: 'library-outline',
  FacultyNotifications: 'notifications-outline',
  FacultyProfile: 'person-outline',
};

export const FacultyTabs = () => {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerTitleAlign: 'left',
        headerStyle: {
          backgroundColor: theme.colors.surface.base,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          ...theme.typography.h3,
          color: theme.colors.text.primary,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface.raised,
          borderTopColor: theme.colors.border.subtle,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.spacing.sm,
          height: 66,
        },
        tabBarLabelStyle: {
          ...theme.typography.caption,
          marginTop: 2,
        },
        tabBarActiveTintColor: theme.colors.brand.primary,
        tabBarInactiveTintColor: theme.colors.text.muted,
        tabBarIcon: ({ color, size, focused }) => (
          <View style={styles.tabIconWrap}>
            <Ionicons
              name={tabIcons[route.name as keyof FacultyTabsParamList]}
              color={color}
              size={size}
            />
            {focused ? <View style={styles.activeDot} /> : null}
          </View>
        ),
      })}
    >
      <Tabs.Screen
        name="FacultyDashboard"
        component={FacultyDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tabs.Screen
        name="FacultyReview"
        component={FacultyReviewScreen}
        options={{ title: 'Review' }}
      />
      <Tabs.Screen
        name="FacultyRepository"
        component={FacultyRepositoryScreen}
        options={{ title: 'Repository' }}
      />
      <Tabs.Screen
        name="FacultyNotifications"
        component={FacultyNotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Tabs.Screen
        name="FacultyProfile"
        component={FacultyProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tabs.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.brand.accent,
  },
});
