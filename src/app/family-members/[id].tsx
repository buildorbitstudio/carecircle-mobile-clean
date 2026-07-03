import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, Screen, SectionHeader } from '@/components/ui';
import { familyRoles, FamilyRole } from '@/features/family/family-config';
import { useFamilyMembers } from '@/features/family/useFamilyMembers';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/theme';

export default function ManageMemberRoleScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const membershipId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { context, members, isLoading, error, retry } = useFamilyMembers();
  const member = members.find((item) => item.membershipId === membershipId);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const changeRole = async (role: FamilyRole) => {
    if (!member || role === member.role) return;
    setIsUpdating(true);
    setUpdateError(null);
    setSuccessMessage(null);

    const { error: roleError } = await supabase.rpc('update_family_member_role', {
      p_membership_id: member.membershipId,
      p_role: role,
    });

    if (roleError) {
      setUpdateError(roleError.message);
      setIsUpdating(false);
      return;
    }

    setSuccessMessage(`${member.fullName} is now ${familyRoles.find((item) => item.value === role)?.label}.`);
    setIsUpdating(false);
  };

  if (isLoading && !member) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText color="inkMuted">Loading family member…</AppText>
      </Screen>
    );
  }

  if ((error || !member) && !isLoading) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <Ionicons color={colors.danger} name="person-remove" size={40} />
        <AppText align="center" variant="h2">
          Family member unavailable
        </AppText>
        <AppText align="center" color="inkMuted">
          {error ?? 'This membership could not be found.'}
        </AppText>
        <AppButton label="Try again" onPress={() => void retry()} />
      </Screen>
    );
  }

  if (!member) return null;

  return (
    <Screen>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <AppText color="primary" style={styles.initials}>
            {initials(member.fullName)}
          </AppText>
        </View>
        <AppText align="center" variant="h1">
          {member.fullName}
        </AppText>
        <AppText align="center" color="inkMuted">
          {member.email}
        </AppText>
        {member.isCurrentUser ? (
          <View style={styles.youBadge}>
            <AppText color="primary" variant="caption">
              This is your membership
            </AppText>
          </View>
        ) : null}
      </View>

      <SectionHeader
        description="Role changes take effect immediately across the family circle."
        title="Manage role"
      />

      {!context?.isAdmin ? (
        <View style={styles.infoBanner}>
          <AppText color="inkMuted" variant="caption">
            Only a family admin can change roles.
          </AppText>
        </View>
      ) : null}

      <View style={styles.roles}>
        {familyRoles.map((role) => {
          const selected = member.role === role.value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: !context?.isAdmin }}
              disabled={!context?.isAdmin || isUpdating}
              key={role.value}
              onPress={() => void changeRole(role.value)}>
              <AppCard style={[styles.roleCard, selected && styles.selectedRole]}>
                <View style={[styles.roleIcon, selected && styles.selectedRoleIcon]}>
                  <Ionicons
                    color={selected ? colors.white : colors.primary}
                    name={role.icon}
                    size={24}
                  />
                </View>
                <View style={styles.grow}>
                  <AppText variant="bodyStrong">{role.label}</AppText>
                  <AppText color="inkMuted" variant="caption">
                    {role.description}
                  </AppText>
                </View>
                {selected ? (
                  <Ionicons color={colors.primary} name="checkmark-circle" size={26} />
                ) : null}
              </AppCard>
            </Pressable>
          );
        })}
      </View>

      {isUpdating ? <ActivityIndicator color={colors.primary} /> : null}
      {updateError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <AppText color="danger" variant="caption">
            {updateError}
          </AppText>
        </View>
      ) : null}
      {successMessage ? (
        <View accessibilityRole="alert" style={styles.successBanner}>
          <AppText color="success" variant="caption">
            {successMessage}
          </AppText>
        </View>
      ) : null}

      <AppText align="center" color="inkMuted" variant="caption">
        CareCircle will not allow the final active admin to be demoted.
      </AppText>
    </Screen>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  profile: { alignItems: 'center', gap: spacing.sm },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 78,
    justifyContent: 'center',
    width: 78,
  },
  initials: { fontSize: 25, fontWeight: '700', lineHeight: 32 },
  youBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  roles: { gap: spacing.md },
  roleCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  selectedRole: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  roleIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  selectedRoleIcon: { backgroundColor: colors.primary },
  grow: { flex: 1, gap: 2 },
  infoBanner: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  successBanner: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
