import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function DocumentsLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.canvas },
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.primaryDark,
      }}>
      <Stack.Screen name="index" options={{ title: 'Document Vault' }} />
      <Stack.Screen name="upload" options={{ title: 'Upload Document' }} />
      <Stack.Screen name="[id]" options={{ title: 'Document Details' }} />
    </Stack>
  );
}
