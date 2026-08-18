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
import { useEffect } from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { PrivacyProvider } from './src/context/PrivacyContext';
import { CoachmarkProvider } from './src/components/coachmarks/CoachmarkProvider';

SplashScreen.preventAutoHideAsync();

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F8FAFC' }}>
        <Text style={{ color: '#B91C1C', textAlign: 'center', fontWeight: 'bold' }}>
          Failed to load essential app resources. Please check your connection and restart the app.
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <AuthProvider>
        <PrivacyProvider>
          <CoachmarkProvider>
            <AppNavigator />
          </CoachmarkProvider>
        </PrivacyProvider>
      </AuthProvider>
    </>
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
