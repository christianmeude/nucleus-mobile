import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts as useRoboto,
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_600SemiBold,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import {
  useFonts as useMontserrat,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { RoleGuard } from './src/navigation/RoleGuard';
import { theme } from './src/theme';

const FontLoader = () => (
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

export default function App() {
  const [uiLoaded] = useRoboto({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_600SemiBold,
    Roboto_700Bold,
  });

  const [displayLoaded] = useMontserrat({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const fontsReady = uiLoaded && displayLoaded;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {fontsReady ? (
        <AuthProvider>
          <RoleGuard>
            <AppNavigator />
          </RoleGuard>
        </AuthProvider>
      ) : (
        <FontLoader />
      )}
    </SafeAreaProvider>
  );
}
