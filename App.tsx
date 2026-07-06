import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts as useRoboto,
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_600SemiBold,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { RoleGuard } from './src/navigation/RoleGuard';

const FontLoader = () => {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface.base,
      }}
    >
      <ActivityIndicator size="large" color={theme.colors.brand.primary} />
    </View>
  );
};

const AppShell = () => {
  const { scheme } = useTheme();

  const [fontsReady] = useRoboto({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_600SemiBold,
    Roboto_700Bold,
  });

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {fontsReady ? (
        <AuthProvider>
          <RoleGuard>
            <AppNavigator />
          </RoleGuard>
        </AuthProvider>
      ) : (
        <FontLoader />
      )}
    </>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
