import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, FormField, Screen, SectionHeader } from '@/components/ui';
import { familyRoles } from '@/features/family/family-config';
import { useFamilyMembers } from '@/features/family/useFamilyMembers';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/theme';
import { invitationSchema, InvitationValues } from '@/validation/invitation';

export default function InviteMemberScreen() {
  const { context, isLoading, error: contextError } = useFamilyMembers();
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

    const { error } = await supabase.rpc('create_family_invitation', {
      p_family_id: context.familyId,
      p_email: values.email.trim().toLowerCase(),
      p_role: values.role,
    });

    if (error) {
      setError('root', { message: error.message });
      return;
    }

    Alert.alert(
      'Invitation saved',
      'The pending invitation is stored in CareCircle. No email was sent in this MVP.',
      [{ text: 'Done', onPress: () => router.replace('/family-members') }],
    );
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
            MVP invitation
          </AppText>
          <AppText color="inkMuted" variant="caption">
            This saves a pending invitation record. It does not send an email yet.
          </AppText>
        </View>
      </View>

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
        label="Save pending invitation"
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
});
