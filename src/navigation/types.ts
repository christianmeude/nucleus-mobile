import type { CompositeNavigationProp } from '@react-navigation/native';
import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { FacultyQueueFilter } from '../screens/faculty/facultyStatus';

export type RootStackParamList = {
  Login: undefined;
  UnsupportedRole: undefined;
  StudentTabs: undefined;
  ResearchDetail: { paperId: string; from?: 'browse' | 'myPapers' | 'dashboard' };
  SubmitResearch: { resubmitPaperId?: string } | undefined;
  Activity: undefined;
  FacultyTabs: undefined;
  FacultyReviewDetail: { paperId: string };
  FacultyPaperDetail: { paperId: string };
};

export type StudentTabsParamList = {
  Dashboard: undefined;
  MyPapers: undefined;
  Browse: undefined;
  Profile: undefined;
};

export type FacultyTabsParamList = {
  FacultyDashboard: undefined;
  FacultyReview: { initialFilter?: FacultyQueueFilter } | undefined;
  FacultyRepository: undefined;
  FacultyNotifications: undefined;
  FacultyProfile: undefined;
};

export type FacultyTabNavigationProp = CompositeNavigationProp<
  MaterialTopTabNavigationProp<FacultyTabsParamList>,
  StackNavigationProp<RootStackParamList>
>;