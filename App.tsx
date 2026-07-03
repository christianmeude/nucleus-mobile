import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts as useSourceSans3,
  SourceSans3_400Regular,
  SourceSans3_500Medium,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from '@expo-google-fonts/source-sans-3';
import {
  useFonts as useRaleway,
  Raleway_400Regular,
  Raleway_500Medium,
  Raleway_600SemiBold,
  Raleway_700Bold,
} from '@expo-google-fonts/raleway';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
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
  const [uiLoaded] = useSourceSans3({
    SourceSans3_400Regular,
    SourceSans3_500Medium,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
  });

  const [displayLoaded] = useRaleway({
    Raleway_400Regular,
    Raleway_500Medium,
    Raleway_600SemiBold,
    Raleway_700Bold,
  });

  const fontsReady = uiLoaded && displayLoaded;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {fontsReady ? (
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      ) : (
        <FontLoader />
      )}
    </SafeAreaProvider>
  );
}
