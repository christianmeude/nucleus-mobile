import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Inbox, Search, CircleUser, Plus } from 'lucide-react-native';
import { FloatingTabBar, type TabMeta } from './FloatingTabBar';
import { StudentTabsParamList } from './types';

const TAB_META: Record<keyof StudentTabsParamList, TabMeta[string]> = {
  Dashboard: { label: 'Home', icon: ['house', 'house.fill', Home] },
  MyPapers: { label: 'Papers', icon: ['tray.full', 'tray.full.fill', Inbox] },
  // `coachmarkId` marks Browse as the third first-run coachmark target (#69).
  Browse: {
    label: 'Browse',
    icon: ['sparkle.magnifyingglass', 'sparkle.magnifyingglass', Search],
    coachmarkId: 'browseTab',
  },
  Profile: {
    label: 'Profile',
    icon: ['person.crop.circle', 'person.crop.circle.fill', CircleUser],
  },
};

/**
 * Student tab bar: the shared {@link FloatingTabBar} configured with four tabs
 * split around the gold Submit FAB (a solid 3D button centered in the bar). All
 * the blur/pill/motion lives in the primitive — this is just the student's tab
 * set + FAB destination.
 */
export const StudentTabBar = (props: BottomTabBarProps) => (
  <FloatingTabBar
    {...props}
    tabMeta={TAB_META}
    fab={{
      // Bold rounded plus — the "create a new submission" affordance. The prior
      // `create-outline` read as thin/weak on the gold button.
      icon: 'plus',
      lucideIcon: Plus,
      accessibilityLabel: 'Submit research',
      onPress: () => props.navigation.getParent()?.navigate('SubmitResearch' as never),
    }}
  />
);
