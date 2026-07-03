import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts as useIBMPlexSans,
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans';
import {
  useFonts as useSourceSerif4,
  SourceSerif4_400Regular,
  SourceSerif4_500Medium,
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold,
} from '@expo-google-fonts/source-serif-4';
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
  const [uiLoaded] = useIBMPlexSans({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
  });

  const [displayLoaded] = useSourceSerif4({
    SourceSerif4_400Regular,
    SourceSerif4_500Medium,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
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
