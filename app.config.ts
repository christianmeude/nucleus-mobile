import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): any => {
  const IS_DEV = process.env.APP_VARIANT === 'development';
  const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

  return {
    ...config,
    name: IS_DEV
      ? 'NUcleus Mobile (Dev)'
      : IS_PREVIEW
        ? 'NUcleus Mobile (Preview)'
        : 'NUcleus Mobile',
    slug: 'nucleus-student-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV
        ? 'com.christianmeude.nucleus.dev'
        : IS_PREVIEW
          ? 'com.christianmeude.nucleus.preview'
          : 'com.christianmeude.nucleus',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: IS_DEV
        ? 'com.christianmeude.nucleus.dev'
        : IS_PREVIEW
          ? 'com.christianmeude.nucleus.preview'
          : 'com.christianmeude.nucleus',
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    } as any,
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-dev-client',
      'expo-web-browser',
      'expo-font',
      'expo-status-bar',
      'expo-splash-screen',
    ],
    extra: {
      eas: {
        projectId: 'cfc58fb4-9bdc-4fd8-91ed-44a201032d8d',
      },
    },
    owner: 'christianmeude',
  };
};
