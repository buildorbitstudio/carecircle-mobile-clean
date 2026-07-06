import { Stack } from 'expo-router';
import { colors } from '@/theme';
export default function ElderProfileLayout() {
  return <Stack screenOptions={{ contentStyle: { backgroundColor: colors.canvas }, headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.canvas }, headerTintColor: colors.primaryDark }}>
    <Stack.Screen name="index" options={{ title: 'Elder Profile' }} />
    <Stack.Screen name="edit" options={{ title: 'Edit Elder Profile' }} />
  </Stack>;
}
