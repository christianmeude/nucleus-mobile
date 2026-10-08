import { ActivityIndicator, View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';

import { PrivacyProvider } from './src/context/PrivacyContext';
import { CoachmarkProvider } from './src/components/coachmarks/CoachmarkProvider';

SplashScreen.preventAutoHideAsync();

const ThemeTransitionOverlay = () => {
  const { theme, scheme } = useTheme();
  const opacity = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const prevScheme = useRef(scheme);
  useEffect(() => {
    if (prevScheme.current === scheme) return;
    prevScheme.current = scheme;
    if (reduceMotion) return;
    opacity.value = 0;
    opacity.value = withTiming(0.32, { duration: 90, easing: Easing.out(Easing.quad) }, () => {
      opacity.value = withTiming(0, { duration: 120, easing: Easing.in(Easing.quad) });
    });
  }, [scheme]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.surface.base,
          zIndex: 999,
        },
        style,
      ]}
    />
  );
};

const AppShell = () => {
  const { scheme } = useTheme();

  const [fontsReady, error] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsReady || error) {
      if (error) {
        console.error('Failed to load fonts:', error);
      }
      SplashScreen.hideAsync();
    }
  }, [fontsReady, error]);

  if (!fontsReady && !error) {
    return null;
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          backgroundColor: '#F8FAFC',
        }}
      >
        <Text style={{ color: '#B91C1C', textAlign: 'center', fontWeight: 'bold' }}>
          Failed to load essential app resources. Please check your connection and restart the app.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AuthProvider>
        <PrivacyProvider>
          <CoachmarkProvider>
            <AppNavigator />
          </CoachmarkProvider>
        </PrivacyProvider>
      </AuthProvider>
      <ThemeTransitionOverlay />
    </View>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <BottomSheetModalProvider>
            <AppShell />
          </BottomSheetModalProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
