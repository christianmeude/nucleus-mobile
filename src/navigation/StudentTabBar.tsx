import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { FloatingTabBar, type TabMeta } from './FloatingTabBar';
import { StudentTabsParamList } from './types';

const TAB_META: Record<keyof StudentTabsParamList, TabMeta[string]> = {
  Dashboard: { label: 'Home', icon: ['house', 'house.fill', 'home-outline', 'home'] },
  MyPapers: { label: 'Papers', icon: ['tray.full', 'tray.full.fill', 'file-tray-full-outline', 'file-tray-full'] },
  // `coachmarkId` marks Browse as the third first-run coachmark target (#69).
  Browse: { label: 'Browse', icon: ['sparkle.magnifyingglass', 'sparkle.magnifyingglass', 'search-outline', 'search'], coachmarkId: 'browseTab' },
  Profile: { label: 'Profile', icon: ['person.crop.circle', 'person.crop.circle.fill', 'person-circle-outline', 'person-circle'] },
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
      ionIcon: 'add',
      accessibilityLabel: 'Submit research',
      onPress: () => props.navigation.getParent()?.navigate('SubmitResearch' as never),
    }}
  />
);
