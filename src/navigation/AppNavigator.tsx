import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { RootStackParamList, StudentTabsParamList } from './types';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { UnsupportedRoleScreen } from '../screens/auth/UnsupportedRoleScreen';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { MyPapersScreen } from '../screens/main/MyPapersScreen';
import { BrowseScreen } from '../screens/main/BrowseScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { ActivityScreen } from '../screens/main/ActivityScreen';
import { ResearchDetailScreen } from '../screens/main/ResearchDetailScreen';
import { SubmitResearchScreen } from '../screens/main/SubmitResearchScreen';
import { StudentTabBar } from './StudentTabBar';
import { FacultyTabs } from './FacultyTabs';
import { FacultyReviewDetailScreen } from '../screens/faculty/FacultyReviewDetailScreen';
import { FacultyPaperDetailScreen } from '../screens/faculty/FacultyPaperDetailScreen';
import { Logo } from '../components/ui';
import { ResearchDetailHeader } from './ResearchDetailHeader';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<StudentTabsParamList>();

const StudentTabs = () => {
  return (
    <Tabs.Navigator
      tabBar={(props) => <StudentTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="Dashboard" component={DashboardScreen} />
      <Tabs.Screen name="MyPapers" component={MyPapersScreen} />
      <Tabs.Screen name="Browse" component={BrowseScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
};

const FullScreenLoader = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.loaderContainer}>
      <Logo size="sm" showWordmark={false} />
      <ActivityIndicator size="large" color={theme.colors.brand.primary} />
      <Text style={styles.loaderText}>Restoring session...</Text>
    </View>
  );
};

export const AppNavigator = () => {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return <FullScreenLoader />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface.base },
          headerShadowVisible: false,
          headerTintColor: theme.colors.brand.primary,
          headerTitleStyle: {
            ...theme.typography.h3,
            color: theme.colors.text.primary,
          },
          headerTitleAlign: 'left',
        }}
      >
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : user.role === 'student' ? (
          <>
            <Stack.Screen
              name="StudentTabs"
              component={StudentTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ResearchDetail"
              component={ResearchDetailScreen}
              options={{
                title: 'Research Detail',
                header: (props) => <ResearchDetailHeader {...props} />,
              }}
            />
            <Stack.Screen
              name="SubmitResearch"
              component={SubmitResearchScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Activity"
              component={ActivityScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : user.role === 'faculty' ? (
          <>
            <Stack.Screen
              name="FacultyTabs"
              component={FacultyTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="FacultyReviewDetail"
              component={FacultyReviewDetailScreen}
              options={{
                title: 'Paper Review',
                header: (props) => <ResearchDetailHeader {...props} />,
              }}
            />
            <Stack.Screen
              name="FacultyPaperDetail"
              component={FacultyPaperDetailScreen}
              options={{
                title: 'Research Detail',
                header: (props) => <ResearchDetailHeader {...props} />,
              }}
            />
            <Stack.Screen
              name="Activity"
              component={ActivityScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <Stack.Screen
            name="UnsupportedRole"
            component={UnsupportedRoleScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    loaderContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing.sm,
      backgroundColor: t.colors.surface.base,
    },
    loaderText: {
      ...t.typography.body,
      color: t.colors.text.secondary,
    },
  });
