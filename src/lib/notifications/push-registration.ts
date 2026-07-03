import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { configureNotificationChannels } from './local-notifications';

const STORED_TOKEN_KEY = 'carecircle.expoPushToken';

export async function registerPushNotifications(userId: string) {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;

  await configureNotificationChannels();

  const existingPermission = await Notifications.getPermissionsAsync();
  let permission = existingPermission.status;
  if (permission !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    permission = requested.status;
  }
  if (permission !== 'granted') return null;

  // Local notifications work without an EAS project. Remote Expo push tokens require one.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId || !Device.isDevice) return null;

  const expoPushToken = (
    await Notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;

  const { error } = await supabase.from('device_push_tokens').upsert(
    {
      user_id: userId,
      expo_push_token: expoPushToken,
      platform: Platform.OS,
      device_name: Device.modelName,
      app_version: Constants.expoConfig?.version ?? null,
      active: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,expo_push_token' },
  );
  if (error) throw error;

  await AsyncStorage.setItem(STORED_TOKEN_KEY, expoPushToken);
  return expoPushToken;
}

export async function deactivateCurrentPushToken(userId: string) {
  const expoPushToken = await AsyncStorage.getItem(STORED_TOKEN_KEY);
  if (!expoPushToken) return;

  const { error } = await supabase
    .from('device_push_tokens')
    .update({ active: false, last_seen_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('expo_push_token', expoPushToken);
  if (error) throw error;
  await AsyncStorage.removeItem(STORED_TOKEN_KEY);
}
