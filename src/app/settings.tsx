import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppButton,
  AppCard,
  ConfirmationModal,
  FeatureRow,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const [showSignOut, setShowSignOut] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const openSignOut = () => {
    setSignOutError(null);
    setShowSignOut(true);
  };

  const cancelSignOut = () => {
    if (isSigningOut) return;
    setShowSignOut(false);
    setSignOutError(null);
  };

  const confirmSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      await signOut();
      setShowSignOut(false);
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : 'Unable to sign out. Please try again.',
      );
    } finally {
      setIsSigningOut(false);
    }
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
      <AppButton label="Sign out" onPress={openSignOut} variant="ghost" />
      <ConfirmationModal
        confirmLabel="Sign Out"
        description="You’ll need to sign in again to access your family circle."
        destructive
        error={signOutError}
        loading={isSigningOut}
        onCancel={cancelSignOut}
        onConfirm={() => void confirmSignOut()}
        title="Sign out?"
        visible={showSignOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
});
