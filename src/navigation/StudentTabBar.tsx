import { House, Inbox, Search, CircleUser } from 'lucide-react-native';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { FloatingTabBar, type TabMeta } from './FloatingTabBar';
import { StudentTabsParamList } from './types';

const TAB_META: Record<keyof StudentTabsParamList, TabMeta[string]> = {
  Dashboard: { label: 'Home', icon: House },
  MyPapers: { label: 'Papers', icon: Inbox },
  Browse: { label: 'Browse', icon: Search },
  Profile: {
    label: 'Profile',
    icon: CircleUser,
  },
};

/**
 * Student tab bar: the shared {@link FloatingTabBar} configured with four tabs.
 * The Submit action has been moved to the MyPapers screen.
 */
export const StudentTabBar = (props: MaterialTopTabBarProps) => (
  <FloatingTabBar {...props} tabMeta={TAB_META} />
);
