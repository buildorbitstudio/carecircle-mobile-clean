import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function FamilyMembersLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.canvas },
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.primaryDark,
      }}>
      <Stack.Screen name="index" options={{ title: 'Family Members' }} />
      <Stack.Screen name="invite" options={{ title: 'Invite Member' }} />
      <Stack.Screen name="[id]" options={{ title: 'Manage Role' }} />
    </Stack>
  );
}
