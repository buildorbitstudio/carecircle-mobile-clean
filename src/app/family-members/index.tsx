import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { familyRoleConfig } from '@/features/family/family-config';
import { FamilyInvitation, FamilyMember } from '@/features/family/types';
import { useFamilyMembers } from '@/features/family/useFamilyMembers';
import { colors, radius, spacing } from '@/theme';

export default function FamilyMembersScreen() {
  const {
    context,
    members,
    invitations,
    isLoading,
    isRefreshing,
    error,
    refresh,
    retry,
  } = useFamilyMembers();

  if (isLoading && !context) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText color="inkMuted">Loading family circle…</AppText>
      </Screen>
    );
  }

  if (error && !context) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <Ionicons color={colors.danger} name="people" size={40} />
        <AppText align="center" variant="h2">
          Family members unavailable
        </AppText>
        <AppText align="center" color="inkMuted">
          {error}
        </AppText>
        <AppButton label="Try again" onPress={() => void retry()} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => void refresh()} refreshing={isRefreshing}>
      <SectionHeader
        description={`The trusted people in ${context?.familyName ?? 'your family circle'}.`}
        title="Family Members"
      />

      {context?.isAdmin ? (
        <AppButton label="Invite family member" onPress={() => router.push('/family-members/invite')} />
      ) : (
        <View style={styles.infoBanner}>
          <Ionicons color={colors.primary} name="information-circle" size={20} />
          <AppText color="inkMuted" style={styles.grow} variant="caption">
            Only family admins can invite members or change roles.
          </AppText>
        </View>
      )}

      {error ? (
        <View accessibilityRole="alert" style={styles.warningBanner}>
          <AppText color="warning" variant="caption">
            Some family information may be out of date. Pull down to retry.
          </AppText>
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="h2">Active members ({members.length})</AppText>
        <AppCard>
          {members.length ? (
            members.map((member, index) => (
              <View key={member.membershipId}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <MemberRow canManage={Boolean(context?.isAdmin)} member={member} />
              </View>
            ))
          ) : (
            <EmptyState
              description="Active family members will appear here."
              icon="people-outline"
              title="No members found"
            />
          )}
        </AppCard>
      </View>

      {context?.isAdmin ? (
        <View style={styles.section}>
          <AppText variant="h2">Pending invitations ({invitations.length})</AppText>
          <AppCard>
            {invitations.length ? (
              invitations.map((invitation, index) => (
                <View key={invitation.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <InvitationRow invitation={invitation} />
                </View>
              ))
            ) : (
              <EmptyState
                description="Invitations created by an admin will appear here."
                icon="mail-outline"
                title="No pending invitations"
              />
            )}
          </AppCard>
        </View>
      ) : null}
    </Screen>
  );
}

function MemberRow({ member, canManage }: { member: FamilyMember; canManage: boolean }) {
  const role = familyRoleConfig(member.role);
  return (
    <Pressable
      accessibilityRole={canManage ? 'button' : undefined}
      disabled={!canManage}
      onPress={() =>
        router.push({
          pathname: '/family-members/[id]',
          params: { id: member.membershipId },
        })
      }
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {member.avatarUrl ? (
        <Image
          alt={`${member.fullName} profile photo`}
          source={{ uri: member.avatarUrl }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatarFallback}>
          <AppText color="primary" variant="bodyStrong">
            {initials(member.fullName)}
          </AppText>
        </View>
      )}
      <View style={styles.grow}>
        <View style={styles.nameRow}>
          <AppText variant="bodyStrong">{member.fullName}</AppText>
          {member.isCurrentUser ? (
            <View style={styles.youBadge}>
              <AppText color="primary" variant="caption">
                You
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText color="inkMuted" numberOfLines={1} variant="caption">
          {member.email}
        </AppText>
        <View style={styles.roleLine}>
          <Ionicons color={colors.primary} name={role.icon} size={15} />
          <AppText color="primary" variant="caption">
            {role.label}
          </AppText>
        </View>
      </View>
      {canManage ? <Ionicons color={colors.inkMuted} name="chevron-forward" size={20} /> : null}
    </Pressable>
  );
}

function InvitationRow({ invitation }: { invitation: FamilyInvitation }) {
  const role = familyRoleConfig(invitation.role);
  const expired = new Date(invitation.expires_at).getTime() < Date.now();
  return (
    <View style={styles.row}>
      <View style={styles.inviteIcon}>
        <Ionicons color={colors.warning} name="mail" size={22} />
      </View>
      <View style={styles.grow}>
        <AppText numberOfLines={1} variant="bodyStrong">
          {invitation.email}
        </AppText>
        <AppText color="inkMuted" variant="caption">
          {role.label} • {expired ? 'Expired' : 'Pending'}
        </AppText>
        <AppText color="inkMuted" variant="caption">
          Created {formatDate(invitation.created_at)}
        </AppText>
      </View>
      <View style={[styles.pendingBadge, expired && styles.expiredBadge]}>
        <AppText color={expired ? 'danger' : 'warning'} variant="caption">
          {expired ? 'Expired' : 'Pending'}
        </AppText>
      </View>
    </View>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  section: { gap: spacing.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 66 },
  pressed: { opacity: 0.65 },
  avatar: { borderRadius: radius.pill, height: 50, width: 50 },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  inviteIcon: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  grow: { flex: 1, gap: 2 },
  nameRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  youBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  roleLine: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  pendingBadge: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  expiredBadge: { backgroundColor: colors.dangerSoft },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  infoBanner: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  warningBanner: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
