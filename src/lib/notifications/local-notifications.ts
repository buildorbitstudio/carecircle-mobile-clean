import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

type NotificationData = Record<string, string | number | boolean>;
const medicationReminderKey = (medicationId: string) =>
  `carecircle.medicationReminders.${medicationId}`;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function configureNotificationChannels() {
  if (Platform.OS !== 'android') return;

  await Promise.all([
    Notifications.setNotificationChannelAsync('carecircle', {
      name: 'CareCircle updates',
      description: 'Care Pings and family care updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 180, 250],
      lightColor: '#376B67',
      sound: 'default',
    }),
    Notifications.setNotificationChannelAsync('urgent-care', {
      name: 'Urgent care alerts',
      description: 'Need Help and unanswered Care Ping alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#B94A48',
      sound: 'default',
      bypassDnd: false,
    }),
    Notifications.setNotificationChannelAsync('medication-reminders', {
      name: 'Medication reminders',
      description: 'Scheduled medication reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#376B67',
      sound: 'default',
    }),
  ]);
}

async function notificationsAllowed() {
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.status === 'granted';
}

async function presentLocalNotification({
  title,
  body,
  data,
  channelId = 'carecircle',
}: {
  title: string;
  body: string;
  data: NotificationData;
  channelId?: string;
}) {
  if (!(await notificationsAllowed())) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: Platform.OS === 'android' ? { channelId } : null,
  });
}

export function notifyNewCarePing({
  elderName,
  message,
  pingId,
}: {
  elderName: string;
  message: string;
  pingId?: string;
}) {
  return presentLocalNotification({
    title: `New Care Ping for ${elderName}`,
    body: message,
    data: { kind: 'care_ping_received', pingId: pingId ?? '', route: '/elder' },
  });
}

export function notifyCarePingResponse({
  elderName,
  response,
  pingId,
}: {
  elderName: string;
  response: string;
  pingId: string;
}) {
  return presentLocalNotification({
    title: `${elderName} responded`,
    body: response,
    data: { kind: 'care_ping_response', pingId, route: '/pings' },
  });
}

export function notifyNeedHelp({
  elderName,
  response,
  pingId,
}: {
  elderName: string;
  response: string;
  pingId: string;
}) {
  return presentLocalNotification({
    title: `Urgent: ${elderName} needs attention`,
    body: response,
    channelId: 'urgent-care',
    data: { kind: 'need_help', pingId, route: '/pings' },
  });
}

export function notifyUnansweredPings(count: number) {
  if (count < 1) return Promise.resolve(null);
  return presentLocalNotification({
    title: 'Care Ping unanswered',
    body:
      count === 1
        ? 'A Care Ping has not been answered within 30 minutes.'
        : `${count} Care Pings have not been answered within 30 minutes.`,
    channelId: 'urgent-care',
    data: { kind: 'unanswered_ping', count, route: '/pings' },
  });
}

export async function scheduleMedicationReminders({
  medicationId,
  medicationName,
  dosage,
  scheduledTimes,
}: {
  medicationId: string;
  medicationName: string;
  dosage: string;
  scheduledTimes: string[];
}) {
  if (!(await notificationsAllowed())) return [];

  await cancelMedicationReminders(medicationId);
  const identifiers = await Promise.all(
    scheduledTimes.map((time) => {
      const [hour, minute] = time.split(':').map(Number);
      return Notifications.scheduleNotificationAsync({
        content: {
          title: 'Medication reminder',
          body: `Time for ${medicationName} ${dosage}.`,
          data: {
            kind: 'medication_reminder',
            medicationId,
            route: `/medications/${medicationId}`,
          },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: 'medication-reminders',
        },
      });
    }),
  );

  await AsyncStorage.setItem(medicationReminderKey(medicationId), JSON.stringify(identifiers));
  return identifiers;
}

export async function cancelMedicationReminders(medicationId: string) {
  const key = medicationReminderKey(medicationId);
  const storedIdentifiers = await AsyncStorage.getItem(key);
  if (!storedIdentifiers) return;

  const identifiers = JSON.parse(storedIdentifiers) as string[];
  await Promise.all(
    identifiers.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier),
    ),
  );
  await AsyncStorage.removeItem(key);
}

export async function scheduleSnoozedMedication({
  medicationId,
  medicationName,
  minutes = 15,
}: {
  medicationId: string;
  medicationName: string;
  minutes?: number;
}) {
  if (!(await notificationsAllowed())) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Medication reminder',
      body: `Reminder to take ${medicationName}.`,
      data: {
        kind: 'medication_reminder',
        medicationId,
        route: `/medications/${medicationId}`,
      },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: minutes * 60,
      channelId: 'medication-reminders',
    },
  });
}
