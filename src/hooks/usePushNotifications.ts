import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';

export function usePushNotifications() {
  const [isRegistering, setIsRegistering] = useState(false);

  const requestAndRegisterPushToken = useCallback(async () => {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    try {
      setIsRegistering(true);

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID, // Ensure projectId is passed if you're using EAS Build
      });

      const token = tokenData.data;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // Register the token with Supabase via the RPC
      const { error } = await supabase.rpc('register_push_token', {
        token: token,
      });

      if (error) {
        console.error('Failed to register push token with Supabase:', error);
      } else {
        console.log('Push token successfully registered:', token);
      }

      return token;
    } catch (error) {
      console.error('Error during push registration:', error);
      return null;
    } finally {
      setIsRegistering(false);
    }
  }, []);

  return { requestAndRegisterPushToken, isRegistering };
}
