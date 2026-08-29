import { House, Inbox, Search, CircleUser } from 'lucide-react-native';
import { FloatingTabBar, type TabMeta } from './FloatingTabBar';
import { StudentTabsParamList } from './types';

const TAB_META: Record<keyof StudentTabsParamList, TabMeta[string]> = {
  Dashboard: { label: 'Home', icon: House },
  MyPapers: { label: 'Papers', icon: Inbox },
  // `coachmarkId` marks Browse as the third first-run coachmark target (#69).
  Browse: {
    label: 'Browse',
    icon: Search,
    coachmarkId: 'browseTab',
  },
  Profile: {
    label: 'Profile',
    icon: CircleUser,
  },
};

/**
 * Student tab bar: the shared {@link FloatingTabBar} configured with four tabs.
 * The Submit action has been moved to the MyPapers screen.
 */
export const StudentTabBar = (props: any) => <FloatingTabBar {...props} tabMeta={TAB_META} />;
