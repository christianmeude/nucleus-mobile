export type RootStackParamList = {
  Login: undefined;
  UnsupportedRole: undefined;
  StudentTabs: undefined;
  ResearchDetail: { paperId: string };
  SubmitResearch: { resubmitPaperId?: string } | undefined;
};

export type StudentTabsParamList = {
  Dashboard: undefined;
  MyPapers: undefined;
  Browse: undefined;
  Notifications: undefined;
  Invitations: undefined;
};
