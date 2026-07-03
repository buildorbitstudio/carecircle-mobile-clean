import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/providers/AuthProvider';
import { registerPushNotifications } from '@/lib/notifications/push-registration';

const knownRoutes = new Set([
  '/elder',
  '/pings',
  '/medications',
  '/tasks',
  '/timeline',
  '/emergency',
]);

export function NotificationBootstrap() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user.id) return;

    const timer = setTimeout(() => {
      void registerPushNotifications(session.user.id).catch((error: unknown) => {
        console.warn(
          'Push notification registration failed:',
          error instanceof Error ? error.message : error,
        );
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [session?.user.id]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (typeof route === 'string' && knownRoutes.has(route)) {
        router.push(route as never);
      }
    });
    return () => subscription.remove();
  }, []);

  return null;
}
