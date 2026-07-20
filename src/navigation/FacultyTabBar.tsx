import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { FloatingTabBar, type TabMeta } from './FloatingTabBar';
import { FacultyTabsParamList } from './types';

// Four tabs, no FAB (faculty has no Submit action). Review takes the student's
// My Papers slot; Browse is the same repository screen both roles share. Icons
// follow the student outline/filled convention: Review uses a check-review pair
// to read distinctly from Browse's search glyph.
const TAB_META: Partial<Record<keyof FacultyTabsParamList, TabMeta[string]>> = {
  FacultyDashboard: { label: 'Home', icon: ['house', 'house.fill'] },
  FacultyReview: { label: 'Review', icon: ['checkmark.seal', 'checkmark.seal.fill'] },
  FacultyRepository: { label: 'Browse', icon: ['magnifyingglass', 'magnifyingglass'] },
  FacultyProfile: { label: 'Profile', icon: ['person', 'person.fill'] },
};

/**
 * Faculty tab bar: the shared {@link FloatingTabBar} with four tabs and no FAB.
 * Identical frosted bar + sliding-spring pill as the student bar, so the two
 * roles stay visually in lockstep from one source.
 */
export const FacultyTabBar = (props: BottomTabBarProps) => (
  <FloatingTabBar {...props} tabMeta={TAB_META as TabMeta} />
);
