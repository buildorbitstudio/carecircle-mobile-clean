import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Linking, Pressable, Share, StyleSheet, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  FeedbackBanner,
  FormField,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { familyRoles } from '@/features/family/family-config';
import { buildFamilyInviteLink, buildFamilyInviteMessage } from '@/features/family/invite-links';
import { useFamilyMembers } from '@/features/family/useFamilyMembers';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/theme';
import { invitationSchema, InvitationValues } from '@/validation/invitation';

type CreatedInvitation = {
  invite_token: string;
};

export default function InviteMemberScreen() {
  const { context, isLoading, error: contextError } = useFamilyMembers();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InvitationValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: { email: '', role: 'member' },
  });

  const submit = async (values: InvitationValues) => {
    if (!context?.isAdmin) {
      setError('root', { message: 'Only a family admin can create invitations.' });
      return;
    }

    const { data, error } = await supabase.rpc('create_family_invitation', {
      p_family_id: context.familyId,
      p_email: values.email.trim().toLowerCase(),
      p_role: values.role,
    });

    if (error || !data) {
      setError('root', { message: error?.message ?? 'Unable to create invitation link.' });
      return;
    }

    const invitation = data as CreatedInvitation;
    const nextInviteLink = buildFamilyInviteLink(invitation.invite_token);
    setInviteLink(nextInviteLink);
    setShareError(null);
  };

  const shareInvite = async () => {
    if (!inviteLink || !context) return;

    try {
      await Share.share({
        title: `Join ${context.familyName} on CareCircle`,
        message: buildFamilyInviteMessage({
          familyName: context.familyName,
          inviteLink,
        }),
        url: inviteLink,
      });
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'Unable to open sharing options.');
    }
  };

  return (
    <Screen>
      <SectionHeader
        description={`Invite someone to ${context?.familyName ?? 'your family circle'}.`}
        title="Invite family member"
      />

      <View style={styles.mvpNotice}>
        <Ionicons color={colors.warning} name="information-circle" size={22} />
        <View style={styles.grow}>
          <AppText color="warning" variant="bodyStrong">
            Invite link
          </AppText>
          <AppText color="inkMuted" variant="caption">
            CareCircle creates a private joining link. Send it with your normal messaging app.
          </AppText>
        </View>
      </View>

      {inviteLink ? (
        <AppCard style={styles.linkCard}>
          <FeedbackBanner
            message="Send this link to the invited person. After they sign up or sign in, they will join this family circle automatically."
            title="Invitation link ready"
            tone="success"
          />
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(inviteLink)}
            style={styles.linkBox}>
            <AppText color="primary" selectable variant="caption">
              {inviteLink}
            </AppText>
          </Pressable>
          {shareError ? (
            <View accessibilityRole="alert" style={styles.errorBanner}>
              <AppText color="danger" variant="caption">
                {shareError}
              </AppText>
            </View>
          ) : null}
          <View style={styles.actions}>
            <AppButton label="Share invite link" onPress={() => void shareInvite()} />
            <AppButton
              label="Done"
              onPress={() => router.replace('/family-members')}
              variant="secondary"
            />
          </View>
        </AppCard>
      ) : null}

      {contextError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <AppText color="danger" variant="caption">
            {contextError}
          </AppText>
        </View>
      ) : null}

      <Controller
        control={control}
        name="email"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField
            autoCapitalize="none"
            autoComplete="email"
            autoFocus
            error={errors.email?.message}
            keyboardType="email-address"
            label="Email address"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="family@example.com"
            value={value}
          />
        )}
      />

      <Controller
        control={control}
        name="role"
        render={({ field: { onChange, value } }) => (
          <View style={styles.roles}>
            <AppText variant="h3">Choose a role</AppText>
            {familyRoles.map((role) => {
              const selected = value === role.value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={role.value}
                  onPress={() => onChange(role.value)}>
                  <AppCard style={[styles.roleCard, selected && styles.selectedRole]}>
                    <View style={[styles.roleIcon, selected && styles.selectedRoleIcon]}>
                      <Ionicons
                        color={selected ? colors.white : colors.primary}
                        name={role.icon}
                        size={23}
                      />
                    </View>
                    <View style={styles.grow}>
                      <AppText variant="bodyStrong">{role.label}</AppText>
                      <AppText color="inkMuted" variant="caption">
                        {role.description}
                      </AppText>
                    </View>
                    <Ionicons
                      color={selected ? colors.primary : colors.border}
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={25}
                    />
                  </AppCard>
                </Pressable>
              );
            })}
          </View>
        )}
      />

      {errors.root ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <AppText color="danger" variant="caption">
            {errors.root.message}
          </AppText>
        </View>
      ) : null}

      <AppButton
        disabled={!context?.isAdmin || isLoading}
        label="Create joining link"
        loading={isSubmitting}
        onPress={handleSubmit(submit)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mvpNotice: {
    alignItems: 'flex-start',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  grow: { flex: 1, gap: 2 },
  roles: { gap: spacing.md },
  roleCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  selectedRole: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  roleIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  selectedRoleIcon: { backgroundColor: colors.primary },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  linkCard: { gap: spacing.md },
  linkBox: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  actions: { gap: spacing.md },
});
