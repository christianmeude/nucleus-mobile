import { View, Text } from 'react-native';
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
import { ThemeTransitionOverlay } from './src/components/ui';

import { PrivacyProvider } from './src/context/PrivacyContext';

SplashScreen.preventAutoHideAsync();

const AppShell = () => {
  const { scheme } = useTheme();

  const [fontsReady, error] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fallback: a stalled font fetch must never wedge the splash forever
  // (seen as 5-10s hangs on cold start). Fonts-ready hides first; the timer
  // only fires if loading stalls — content renders with system font instead.
  const splashHidden = useRef(false);
  const hideSplash = () => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    SplashScreen.hideAsync().catch(() => {
      /* already hidden or detached — not fatal */
    });
  };

  useEffect(() => {
    if (fontsReady || error) {
      if (error) {
        console.error('Failed to load fonts:', error);
      }
      hideSplash();
    }
  }, [fontsReady, error]);

  useEffect(() => {
    const t = setTimeout(hideSplash, 4000);
    return () => clearTimeout(t);
  }, []);

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
          <AppNavigator />
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
