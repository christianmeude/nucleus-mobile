export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: { email?: string } | undefined;
  UnsupportedRole: undefined;
  StudentTabs: undefined;
  ResearchDetail: { paperId: string };
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
  FacultyReview: undefined;
  FacultyRepository: undefined;
  FacultyNotifications: undefined;
  FacultyProfile: undefined;
};