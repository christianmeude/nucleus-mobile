import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
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
import { useHasOnboarded } from '../hooks/useHasOnboarded';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { PrivacyNoticeGate } from '../components/auth/PrivacyNoticeGate';

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

const FullScreenLoader = ({ exiting, onFinished }: { exiting?: boolean; onFinished?: () => void }) => {
  const styles = useThemedStyles(makeStyles);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const haloScale = useSharedValue(0.9);
  const haloOpacity = useSharedValue(0.18);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) });
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    haloOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1200 }),
        withTiming(0.18, { duration: 1200 }),
      ),
      -1,
      true,
    );
  }, []);

  useEffect(() => {
    if (exiting) {
      opacity.value = withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) });
      translateY.value = withTiming(-160, { duration: 520, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished && onFinished) runOnJS(onFinished)();
      });
      haloOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [exiting]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  return (
    <View style={styles.loaderContainer}>
      <Animated.View style={[styles.halo, haloStyle]} />
      <Animated.View style={animatedStyle}>
        <Logo size="xxl" showWordmark={false} />
      </Animated.View>
    </View>
  );
};

export const AppNavigator = () => {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const { hasOnboarded, loaded: onboardingLoaded, markOnboarded } = useHasOnboarded();
  const [loaderDismissed, setLoaderDismissed] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const startRef = useRef<number>(Date.now());

  const needsLoader = loading || (user?.role === 'student' && !onboardingLoaded);

  useEffect(() => {
    if (!needsLoader && !loaderDismissed && !isExiting) {
      const elapsed = Date.now() - startRef.current;
      const wait = Math.max(0, 1200 - elapsed);
      const t = setTimeout(() => setIsExiting(true), wait);
      return () => clearTimeout(t);
    }
    if (needsLoader) {
      startRef.current = Date.now();
      setLoaderDismissed(false);
      setIsExiting(false);
    }
  }, [needsLoader, loaderDismissed, isExiting]);

  if (!loaderDismissed) {
    if (needsLoader) return <FullScreenLoader />;
    return <FullScreenLoader exiting={isExiting} onFinished={() => setLoaderDismissed(true)} />;
  }

  // First-run (A4): a student sees the intro carousel until they finish or skip
  // it. Rendered ahead of the navigator (not as a route) so no navigation-types
  // change is needed; faculty and other roles skip it entirely.
  if (user?.role === 'student' && !hasOnboarded) {
    return <OnboardingScreen onDone={markOnboarded} />;
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
          <>
            <Stack.Screen 
              name="Login" 
              options={{ headerShown: false }}
            >
              {() => (
                <PrivacyNoticeGate>
                  <LoginScreen />
                </PrivacyNoticeGate>
              )}
            </Stack.Screen>
          </>
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
    halo: {
      position: 'absolute',
      width: 340,
      height: 340,
      borderRadius: 170,
      backgroundColor: t.colors.brand.primarySoft,
      shadowColor: t.colors.brand.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 40,
      elevation: 20,
    },
  });
