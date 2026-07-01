export type RootStackParamList = {
  Login: undefined;
  UnsupportedRole: undefined;
  StudentTabs: undefined;
  ResearchDetail: { paperId: string };
  SubmitResearch: { resubmitPaperId?: string } | undefined;
  FacultyTabs: undefined;
  FacultyReviewDetail: { paperId: string };
  FacultyPaperDetail: { paperId: string };
};

export type StudentTabsParamList = {
  Dashboard: undefined;
  MyPapers: undefined;
  Browse: undefined;
  Notifications: undefined;
  Invitations: undefined;
};

export type FacultyTabsParamList = {
  FacultyDashboard: undefined;
  FacultyReview: undefined;
  FacultyRepository: undefined;
  FacultyNotifications: undefined;
  FacultyProfile: undefined;
};