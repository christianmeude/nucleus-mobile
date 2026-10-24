import { Dimensions } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { FacultyTabsParamList } from './types';
import { FacultyDashboardScreen } from '../screens/faculty/FacultyDashboardScreen';
import { FacultyReviewScreen } from '../screens/faculty/FacultyReviewScreen';
import { BrowseScreen } from '../screens/main/BrowseScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { FacultyTabBar } from './FacultyTabBar';
import { useTheme } from '../context/ThemeContext';

const Tabs = createMaterialTopTabNavigator<FacultyTabsParamList>();

/**
 * Faculty tabs: Home, Review, Browse, Profile — the same floating frosted bar
 * as the student navigator (via {@link FacultyTabBar}), minus the Submit FAB.
 * Browse is literally the student {@link BrowseScreen} (both roles read one
 * shared repository); it detects the faculty role internally to route paper taps
 * to the faculty detail screen. The old Notifications tab is gone — faculty
 * reach notifications through the TopBar bell (the Activity screen), matching
 * the student pattern. `FacultyTabsParamList` keeps its now-unused
 * `FacultyNotifications` key; leaving it costs nothing and avoids touching the
 * frozen navigation contract.
 *
 * Material top tabs with `tabBarPosition: 'bottom'` give true finger-tracked
 * horizontal paging behind the floating bar.
 */
export const FacultyTabs = () => {
  const { theme } = useTheme();
  return (
    <Tabs.Navigator
      tabBar={(props) => <FacultyTabBar {...props} />}
      tabBarPosition="bottom"
      backBehavior="firstRoute"
      initialLayout={{ width: Dimensions.get('window').width }}
      screenOptions={{
        swipeEnabled: true,
        lazy: true,
        lazyPreloadDistance: 1,
        sceneStyle: { backgroundColor: theme.colors.surface.base },
      }}
    >
      <Tabs.Screen name="FacultyDashboard" component={FacultyDashboardScreen} />
      <Tabs.Screen name="FacultyReview" component={FacultyReviewScreen} />
      <Tabs.Screen name="FacultyRepository" component={BrowseScreen} />
      <Tabs.Screen name="FacultyProfile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
};
