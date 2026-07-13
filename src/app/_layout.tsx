import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { NotificationBootstrap } from '@/components/NotificationBootstrap';
import { StateView } from '@/components/ui';
import { ToastProvider } from '@/providers/ToastProvider';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <AppErrorBoundary>
            <NotificationBootstrap />
            <RootNavigator />
          </AppErrorBoundary>
        </ToastProvider>
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
        <View style={styles.loadingContent}>
          <StateView count={2} state="loading" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.app}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: colors.canvas },
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.canvas },
          headerTintColor: colors.primaryDark,
          headerTitleStyle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
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
          <Stack.Screen name="appointments" options={{ headerShown: false }} />
          <Stack.Screen name="timeline" options={{ title: 'Health Timeline' }} />
          <Stack.Screen name="emergency" options={{ title: 'Emergency Mode' }} />
          <Stack.Screen name="documents" options={{ headerShown: false }} />
          <Stack.Screen name="family-members" options={{ headerShown: false }} />
          <Stack.Screen name="elder-profile" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="error-test" options={{ title: 'Recovery Test' }} />
        </Stack.Protected>
        <Stack.Screen name="join" options={{ title: 'Join Family' }} />
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
  loadingContent: { maxWidth: 560, padding: 24, width: '100%' },
});
