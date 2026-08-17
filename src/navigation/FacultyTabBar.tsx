import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { House, ClipboardList, Search, CircleUser } from 'lucide-react-native';
import { FloatingTabBar, type TabMeta } from './FloatingTabBar';
import { FacultyTabsParamList } from './types';

// Four tabs, no FAB (faculty has no Submit action). Review takes the student's
// My Papers slot; Browse is the same repository screen both roles share. Icons
// follow the student outline/filled convention: Review uses a check-review pair
// to read distinctly from Browse's search glyph.
const TAB_META: Partial<Record<keyof FacultyTabsParamList, TabMeta[string]>> = {
  FacultyDashboard: { label: 'Home', icon: ['house', 'house.fill', House] },
  FacultyReview: {
    label: 'Review',
    icon: ['list.clipboard', 'list.clipboard.fill', ClipboardList],
  },
  FacultyRepository: {
    label: 'Browse',
    icon: ['sparkle.magnifyingglass', 'sparkle.magnifyingglass', Search],
  },
  FacultyProfile: {
    label: 'Profile',
    icon: ['person.crop.circle', 'person.crop.circle.fill', CircleUser],
  },
};

/**
 * Faculty tab bar: the shared {@link FloatingTabBar} with four tabs and no FAB.
 * Identical frosted bar + sliding-spring pill as the student bar, so the two
 * roles stay visually in lockstep from one source.
 */
export const FacultyTabBar = (props: BottomTabBarProps) => (
  <FloatingTabBar {...props} tabMeta={TAB_META as TabMeta} />
);
