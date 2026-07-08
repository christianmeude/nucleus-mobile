import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FacultyTabsParamList } from './types';
import { FacultyDashboardScreen } from '../screens/faculty/FacultyDashboardScreen';
import { FacultyReviewScreen } from '../screens/faculty/FacultyReviewScreen';
import { BrowseScreen } from '../screens/main/BrowseScreen';
import { FacultyProfileScreen } from '../screens/faculty/FacultyProfileScreen';
import { FacultyTabBar } from './FacultyTabBar';

const Tabs = createBottomTabNavigator<FacultyTabsParamList>();

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
 */
export const FacultyTabs = () => {
  return (
    <Tabs.Navigator
      tabBar={(props) => <FacultyTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="FacultyDashboard" component={FacultyDashboardScreen} />
      <Tabs.Screen name="FacultyReview" component={FacultyReviewScreen} />
      <Tabs.Screen name="FacultyRepository" component={BrowseScreen} />
      <Tabs.Screen name="FacultyProfile" component={FacultyProfileScreen} />
    </Tabs.Navigator>
  );
};
