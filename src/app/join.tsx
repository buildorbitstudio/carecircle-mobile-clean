import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, Screen, SectionHeader, StateView } from '@/components/ui';
import { familyRoleConfig } from '@/features/family/family-config';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store/app-store';
import { colors, radius, spacing } from '@/theme';

type InvitationPreview = {
  id: string;
  family_id: string;
  family_name: string;
  email: string;
  role: 'admin' | 'member' | 'elder';
  expires_at: string;
};

type InvitationAcceptance = {
  elder_profile_id: string | null;
  role: 'admin' | 'member' | 'elder';
};

export default function JoinFamilyScreen() {
  const params = useLocalSearchParams<{
    token?: string | string[];
    accept?: string | string[];
  }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const shouldAutoAccept = (Array.isArray(params.accept) ? params.accept[0] : params.accept) === '1';
  const { refreshOnboardingStatus, session } = useAuth();
  const { setActiveElder, setRole } = useAppStore();
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const role = invitation ? familyRoleConfig(invitation.role) : null;

  const loadInvitation = useCallback(async () => {
    if (!token) {
      setErrorMessage('This invitation link is missing its private token.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase.rpc('get_family_invitation_by_token', {
      p_invite_token: token,
    });

    if (error || !data) {
      setInvitation(null);
      setErrorMessage(error?.message ?? 'Unable to load this invitation.');
      setIsLoading(false);
      return;
    }

    setInvitation(data as InvitationPreview);
    setIsLoading(false);
  }, [token]);

  const acceptInvitation = useCallback(async () => {
    if (!token || isAccepting) return;

    setIsAccepting(true);
    setErrorMessage(null);

    const { data, error } = await supabase.rpc('accept_family_invitation', {
      p_invite_token: token,
    });

    if (error || !data) {
      setErrorMessage(error?.message ?? 'Unable to join this family circle.');
      setIsAccepting(false);
      return;
    }

    const result = data as InvitationAcceptance;
    setRole(result.role);
    if (result.elder_profile_id) {
      setActiveElder(result.elder_profile_id);
    }

    try {
      await refreshOnboardingStatus();
      router.replace('/(family)' as never);
    } catch (refreshError) {
      setErrorMessage(
        refreshError instanceof Error
          ? refreshError.message
          : 'You joined the family, but CareCircle could not refresh. Please restart the app.',
      );
      setIsAccepting(false);
    }
  }, [isAccepting, refreshOnboardingStatus, setActiveElder, setRole, token]);

  useEffect(() => {
    void loadInvitation();
  }, [loadInvitation]);

  useEffect(() => {
    if (shouldAutoAccept && session && invitation && !isAccepting) {
      void acceptInvitation();
    }
  }, [acceptInvitation, invitation, isAccepting, session, shouldAutoAccept]);

  const authParams = useMemo(() => (token ? { inviteToken: token } : undefined), [token]);

  if (isLoading) {
    return (
      <Screen>
        <StateView count={2} state="loading" />
      </Screen>
    );
  }

  if (errorMessage && !invitation) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <StateView
          actionLabel="Try again"
          description={errorMessage}
          icon="mail-open-outline"
          onAction={() => void loadInvitation()}
          state="error"
          title="Invite link unavailable"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText color="primary" variant="h3">
        CareCircle
      </AppText>
      <SectionHeader
        description="A trusted family member invited you to join their private care circle."
        title="Join family circle"
      />

      {invitation ? (
        <AppCard style={styles.card}>
          <View style={styles.icon}>
            <Ionicons color={colors.primary} name="people" size={30} />
          </View>
          <View style={styles.copy}>
            <AppText align="center" variant="h2">
              {invitation.family_name}
            </AppText>
            <AppText align="center" color="inkMuted">
              This invite was sent to {invitation.email}. You will be added as{' '}
              {role?.label.toLowerCase() ?? 'a family member'} and can view the elder profile once
              you join.
            </AppText>
          </View>
          <View style={styles.metaRow}>
            <Ionicons color={colors.primary} name={role?.icon ?? 'person'} size={18} />
            <AppText color="primary" variant="caption">
              {role?.label ?? 'Family Member'}
            </AppText>
          </View>
          <AppText align="center" color="inkMuted" variant="caption">
            Expires {formatDate(invitation.expires_at)}
          </AppText>
        </AppCard>
      ) : null}

      {errorMessage ? (
        <View accessibilityRole="alert" style={styles.error}>
          <AppText color="danger" variant="caption">
            {errorMessage}
          </AppText>
        </View>
      ) : null}

      {session ? (
        <AppButton
          label="Join this family circle"
          loading={isAccepting}
          onPress={() => void acceptInvitation()}
        />
      ) : (
        <View style={styles.actions}>
          <AppButton
            label="Create account to join"
            onPress={() =>
              router.push({
                pathname: '/signup',
                params: authParams,
              })
            }
          />
          <AppButton
            label="I already have an account"
            onPress={() =>
              router.push({
                pathname: '/login',
                params: authParams,
              })
            }
            variant="secondary"
          />
        </View>
      )}
    </Screen>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  copy: { gap: spacing.sm },
  metaRow: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  actions: { gap: spacing.md },
});
