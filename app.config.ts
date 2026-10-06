import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): any => {
  const IS_DEV = process.env.APP_VARIANT === 'development';
  const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

  // expo-dev-client must be dev-only. Shipping it in preview/production
  // exposes the dev menu and bloats the sideload APK.
  const plugins = [
    'expo-web-browser',
    'expo-font',
    'expo-status-bar',
    'expo-splash-screen',
  ];
  if (IS_DEV) {
    plugins.unshift('expo-dev-client');
  }

  return {
    ...config,
    name: IS_DEV
      ? 'NUcleus Mobile (Dev)'
      : IS_PREVIEW
        ? 'NUcleus Mobile (Preview)'
        : 'NUcleus Mobile',
    slug: 'nucleus-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'nucleus-mobile',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV
        ? 'com.christianmeude.nucleusmobile.dev'
        : IS_PREVIEW
          ? 'com.christianmeude.nucleusmobile.preview'
          : 'com.christianmeude.nucleusmobile',
    },
    android: {
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: IS_DEV
        ? 'com.christianmeude.nucleusmobile.dev'
        : IS_PREVIEW
          ? 'com.christianmeude.nucleusmobile.preview'
          : 'com.christianmeude.nucleusmobile',
      // Starting versionCode. EAS `autoIncrement: true` on the production
      // profile bumps this per build so Android accepts APK-over-APK updates.
      versionCode: 1,
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    } as any,
    web: {
      favicon: './assets/favicon.png',
    },
    plugins,
    extra: {
      eas: {
        projectId: '9bf6aa26-5736-4539-8ea8-a1b43b95b7b5',
      },
    },
    updates: {
      url: 'https://u.expo.dev/9bf6aa26-5736-4539-8ea8-a1b43b95b7b5',
      // Sideloaded apps get no Play Store auto-update, so check for EAS
      // Update on every launch and fall back to cached bundle offline.
      enabled: true,
      checkAutomaticallyOnLoad: true,
      fallbackToCacheTimeout: 30000,
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    owner: 'christianmeude',
  };
};
