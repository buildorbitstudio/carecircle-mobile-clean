import { Ionicons } from '@expo/vector-icons';

export type PingType =
  | 'medication'
  | 'wellness'
  | 'hydration'
  | 'meal'
  | 'movement'
  | 'custom';

export type PingResponse = {
  emoji: string;
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
};

export const pingTypeConfig: Record<
  PingType,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    presets: string[];
  }
> = {
  medication: {
    label: 'Medication',
    icon: 'medical',
    presets: ['Did you take your medication?', 'It’s time for your medication.'],
  },
  wellness: {
    label: 'Wellness',
    icon: 'happy',
    presets: ['How are you feeling today?', 'Just checking in. How are you doing?'],
  },
  hydration: {
    label: 'Hydration',
    icon: 'water',
    presets: ['Did you drink some water?', 'Please have a glass of water when you can.'],
  },
  meal: {
    label: 'Meal',
    icon: 'restaurant',
    presets: ['Have you eaten?', 'Were you able to have your meal?'],
  },
  movement: {
    label: 'Movement',
    icon: 'walk',
    presets: ['Can you take a short walk if you feel okay?', 'Did you get a little movement today?'],
  },
  custom: {
    label: 'Custom',
    icon: 'create',
    presets: [],
  },
};

export const pingTypes = Object.keys(pingTypeConfig) as PingType[];

export function responsesForPing(type: PingType): PingResponse[] {
  if (type === 'medication') {
    return [
      { emoji: '👍', label: 'Taken', tone: 'success' },
      { emoji: '⏰', label: 'Remind Me Later', tone: 'warning' },
      { emoji: '❓', label: 'Need Help', tone: 'danger' },
    ];
  }

  if (type === 'wellness') {
    return [
      { emoji: '😊', label: 'Good', tone: 'success' },
      { emoji: '😐', label: 'Okay', tone: 'neutral' },
      { emoji: '😞', label: 'Not Feeling Well', tone: 'warning' },
      { emoji: '❓', label: 'Need Help', tone: 'danger' },
    ];
  }

  return [
    { emoji: '👍', label: 'Done', tone: 'success' },
    { emoji: '⏰', label: 'Later', tone: 'warning' },
    { emoji: '❓', label: 'Need Help', tone: 'danger' },
  ];
}

export function isPingType(value: string): value is PingType {
  return value in pingTypeConfig;
}
