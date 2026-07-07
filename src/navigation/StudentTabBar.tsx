import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { FloatingTabBar, type TabMeta } from './FloatingTabBar';
import { StudentTabsParamList } from './types';

const TAB_META: Record<keyof StudentTabsParamList, TabMeta[string]> = {
  Dashboard: { label: 'Home', icon: ['home-outline', 'home'] },
  MyPapers: { label: 'Papers', icon: ['folder-open-outline', 'folder-open'] },
  Browse: { label: 'Browse', icon: ['search-outline', 'search'] },
  Profile: { label: 'Profile', icon: ['person-outline', 'person'] },
};

/**
 * Student tab bar: the shared {@link FloatingTabBar} configured with four tabs
 * split around the raised gold Submit FAB. All the blur/pill/motion lives in the
 * primitive — this is just the student's tab set + FAB destination.
 */
export const StudentTabBar = (props: BottomTabBarProps) => (
  <FloatingTabBar
    {...props}
    tabMeta={TAB_META}
    fab={{
      icon: 'create-outline',
      accessibilityLabel: 'Submit research',
      onPress: () => props.navigation.getParent()?.navigate('SubmitResearch' as never),
    }}
  />
);
