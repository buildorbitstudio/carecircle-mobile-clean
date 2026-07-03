import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function MedicationsLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.canvas },
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.primaryDark,
      }}>
      <Stack.Screen name="index" options={{ title: 'Medications' }} />
      <Stack.Screen name="add" options={{ title: 'Add Medication' }} />
      <Stack.Screen name="[id]" options={{ title: 'Medication Details' }} />
    </Stack>
  );
}
