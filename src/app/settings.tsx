import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, FeatureRow, Screen, SectionHeader } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You’ll need to sign in again to access your family circle.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setIsSigningOut(true);
          setSignOutError(null);

          try {
            await signOut();
          } catch (error) {
            setSignOutError(
              error instanceof Error ? error.message : 'Unable to sign out. Please try again.',
            );
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <SectionHeader description="Account, notifications, and care preferences." title="Settings" />
      <AppCard>
        <FeatureRow
          description={session?.user.email ?? undefined}
          icon="person-circle"
          title="Account profile"
        />
        <View style={styles.divider} />
        <FeatureRow icon="notifications" title="Notification preferences" />
        <View style={styles.divider} />
        <FeatureRow icon="accessibility" title="Accessibility" />
        <View style={styles.divider} />
        <FeatureRow icon="shield-checkmark" title="Privacy and security" />
      </AppCard>
      {signOutError ? (
        <View accessibilityRole="alert" style={styles.error}>
          <AppText color="danger" variant="caption">
            {signOutError}
          </AppText>
        </View>
      ) : null}
      <AppButton
        label="Sign out"
        loading={isSigningOut}
        onPress={confirmSignOut}
        variant="ghost"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    padding: spacing.md,
  },
});
