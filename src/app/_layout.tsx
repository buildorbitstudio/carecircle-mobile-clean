import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isLoading, onboardingComplete, session } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.app}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.canvas },
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.canvas },
          headerTintColor: colors.primaryDark,
          headerTitleStyle: { color: colors.ink, fontWeight: '600' },
        }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session) && !onboardingComplete}>
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session) && onboardingComplete}>
          <Stack.Screen name="(family)" options={{ headerShown: false }} />
          <Stack.Screen name="elder" options={{ headerShown: false }} />
          <Stack.Screen name="medications" options={{ headerShown: false }} />
          <Stack.Screen name="appointments" options={{ title: 'Appointments' }} />
          <Stack.Screen name="timeline" options={{ title: 'Health Timeline' }} />
          <Stack.Screen name="emergency" options={{ title: 'Emergency Mode' }} />
          <Stack.Screen name="documents" options={{ title: 'Documents' }} />
          <Stack.Screen name="family-members" options={{ title: 'Family Members' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { backgroundColor: colors.canvas, flex: 1 },
  loading: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    flex: 1,
    justifyContent: 'center',
  },
});
