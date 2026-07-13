import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';

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
    if (Platform.OS === 'web') return;

    const timer = setTimeout(() => {
      void import('@/lib/notifications/push-registration')
        .then(({ registerPushNotifications }) =>
          registerPushNotifications(session.user.id),
        )
        .catch((error: unknown) => {
          console.warn(
            'Push notification registration failed:',
            error instanceof Error ? error.message : error,
          );
        });
    }, 0);

    return () => clearTimeout(timer);
  }, [session?.user.id]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let active = true;
    let removeListener: (() => void) | undefined;
    void import('expo-notifications').then((Notifications) => {
      if (!active) return;
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const route = response.notification.request.content.data?.route;
        if (typeof route === 'string' && knownRoutes.has(route)) {
          router.push(route as never);
        }
      });
      removeListener = () => subscription.remove();
    });
    return () => {
      active = false;
      removeListener?.();
    };
  }, []);

  return null;
}
