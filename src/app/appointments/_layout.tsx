import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function AppointmentsLayout() {
  return (
    <Stack screenOptions={{
      contentStyle: { backgroundColor: colors.canvas },
      headerBackButtonDisplayMode: 'minimal',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.canvas },
      headerTintColor: colors.primaryDark,
    }}>
      <Stack.Screen name="index" options={{ title: 'Appointments' }} />
      <Stack.Screen name="add" options={{ title: 'Add Appointment' }} />
      <Stack.Screen name="[id]" options={{ title: 'Appointment Details' }} />
    </Stack>
  );
}
