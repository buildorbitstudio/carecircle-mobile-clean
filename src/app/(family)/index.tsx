import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  EmptyState,
  Screen,
} from '@/components/ui';
import {
  DashboardFamilyMember,
  DashboardMedication,
  DashboardPing,
  DashboardTask,
  useDashboardData,
} from '@/features/dashboard/useDashboardData';
import { ensurePersonalCareProfile } from '@/features/care-context/resolveCareContext';
import { AccountMode, useAppStore } from '@/store/app-store';
import { colors, radius, spacing } from '@/theme';

export default function DashboardScreen() {
  const { data, error, isLoading, isRefreshing, refresh, retry } = useDashboardData();
  const { accountMode, setAccountMode } = useAppStore();

  if (isLoading && !data) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText color="inkMuted">Gathering your family’s care updates…</AppText>
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <View style={styles.errorIcon}>
          <Ionicons color={colors.danger} name="cloud-offline" size={30} />
        </View>
        <AppText align="center" variant="h2">
          We couldn’t load the dashboard
        </AppText>
        <AppText align="center" color="inkMuted">
          {error}
        </AppText>
        <AppButton label="Try again" onPress={() => void retry()} />
      </Screen>
    );
  }

  if (!data) return null;

  return (
    <Screen onRefresh={() => void refresh()} refreshing={isRefreshing}>
      <View style={styles.topBar}>
        <View style={styles.grow}>
          <AppText color="inkMuted" variant="caption">
            {greeting()}, {firstName(data.userName)}
          </AppText>
          <AppText numberOfLines={2} variant="h1">
            {data.isPersonal ? 'Your care today' : `${data.elder.full_name}'s care today`}
          </AppText>
          <AppText color="primary" variant="caption">
            Currently viewing: {data.isPersonal ? 'Individual account' : 'Family account'}
          </AppText>
        </View>
        <Pressable
          accessibilityLabel="Open settings"
          accessibilityRole="button"
          onPress={() => router.push('/settings')}
          style={styles.avatar}>
          <AppText color="white" variant="bodyStrong">
            {initials(data.userName)}
          </AppText>
        </Pressable>
      </View>

      {error ? (
        <View accessibilityRole="alert" style={styles.inlineError}>
          <Ionicons color={colors.warning} name="warning" size={18} />
          <AppText color="warning" style={styles.grow} variant="caption">
            Some information may be out of date. Pull down to retry.
          </AppText>
        </View>
      ) : null}

      <AccountModeSwitcher
        currentMode={accountMode}
        familyName={data.familyName}
        isPersonal={data.isPersonal}
        onChange={async (mode) => {
          if (mode === 'individual') {
            await ensurePersonalCareProfile();
          }
          setAccountMode(mode);
        }}
      />

      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${data.elder.full_name} profile`}
        onPress={() => router.push('/elder-profile' as never)}>
      <AppCard style={styles.elderCard}>
        {data.elder.photo_url ? (
          <Image
            alt={`${data.elder.full_name} profile photo`}
            source={{ uri: data.elder.photo_url }}
            style={styles.elderPhoto}
          />
        ) : (
          <View style={styles.elderAvatar}>
            <Ionicons color={colors.primary} name="person" size={30} />
          </View>
        )}
        <View style={styles.grow}>
          <AppText variant="h3">{data.elder.full_name}</AppText>
          <AppText color="inkMuted" variant="caption">
            {data.familyName}
            {data.elder.date_of_birth
              ? ` • Born ${formatDateOnly(data.elder.date_of_birth)}`
              : ''}
          </AppText>
        </View>
        <Ionicons color={colors.primary} name="chevron-forward" size={22} />
      </AppCard>
      </Pressable>

      <DashboardSection
        actionLabel="View all"
        onAction={() => router.push('/family-members')}
        title={`Family circle (${data.familyMembers.length})`}>
        {data.familyMembers.length ? (
          <>
            <View style={styles.familySummary}>
              <FamilyCount
                count={data.familyMembers.filter((member) => member.role === 'admin').length}
                icon="shield-checkmark"
                label="Admins"
              />
              <FamilyCount
                count={data.familyMembers.filter((member) => member.role === 'member').length}
                icon="people"
                label="Members"
              />
              <FamilyCount
                count={data.familyMembers.filter((member) => member.role === 'elder').length}
                icon="heart"
                label="Elders"
              />
            </View>
            {data.familyMembers.slice(0, 5).map((member, index) => (
              <View key={member.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <FamilyMemberRow member={member} />
              </View>
            ))}
          </>
        ) : (
          <EmptyState
            description="Invite trusted people so everyone can coordinate care together."
            icon="people-outline"
            title="No family members yet"
          />
        )}
      </DashboardSection>

      <AppButton
        label="Send a Care Ping"
        onPress={() => router.push('/pings')}
        variant="primary"
      />

      <DashboardSection
        actionLabel="View all"
        onAction={() => router.push('/medications')}
        title="Today’s medications">
        {data.medications.length ? (
          data.medications.map((medication, index) => (
            <View key={medication.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <MedicationRow medication={medication} />
            </View>
          ))
        ) : (
          <EmptyState
            description="Active medications scheduled for today will appear here."
            icon="medical-outline"
            title="No medications today"
          />
        )}
      </DashboardSection>

      <DashboardSection title="Last wellness response">
        {data.lastWellness ? (
          <WellnessCard ping={data.lastWellness} />
        ) : (
          <EmptyState
            description="Send a wellness Care Ping to start tracking check-ins."
            icon="happy-outline"
            title="No wellness response yet"
          />
        )}
      </DashboardSection>

      <DashboardSection
        actionLabel="Care Pings"
        onAction={() => router.push('/pings')}
        title="Recent Care Pings">
        {data.recentPings.length ? (
          data.recentPings.map((ping, index) => (
            <View key={ping.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <PingRow ping={ping} />
            </View>
          ))
        ) : (
          <EmptyState
            description="Medication and wellness check-ins will appear here."
            icon="notifications-outline"
            title="No Care Pings yet"
          />
        )}
      </DashboardSection>

      <DashboardSection
        actionLabel="View schedule"
        onAction={() => router.push('/appointments')}
        title="Upcoming appointment">
        {data.upcomingAppointment ? (
          <View style={styles.detailRow}>
            <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons color={colors.warning} name="calendar" size={23} />
            </View>
            <View style={styles.grow}>
              <AppText variant="bodyStrong">{data.upcomingAppointment.title}</AppText>
              <AppText color="inkMuted" variant="caption">
                {formatDateTime(data.upcomingAppointment.appointment_time)}
              </AppText>
              {data.upcomingAppointment.clinic_name ? (
                <AppText color="inkMuted" variant="caption">
                  {data.upcomingAppointment.clinic_name}
                </AppText>
              ) : null}
            </View>
          </View>
        ) : (
          <EmptyState
            description="The next scheduled visit will be shown here."
            icon="calendar-outline"
            title="No upcoming appointments"
          />
        )}
      </DashboardSection>

      <DashboardSection
        actionLabel="View tasks"
        onAction={() => router.push('/tasks')}
        title={`Open tasks${data.openTasks.length ? ` (${data.openTasks.length})` : ''}`}>
        {data.openTasks.length ? (
          data.openTasks.map((task, index) => (
            <View key={task.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <TaskRow task={task} />
            </View>
          ))
        ) : (
          <EmptyState
            description="Your family is all caught up for now."
            icon="checkmark-circle-outline"
            title="No open tasks"
          />
        )}
      </DashboardSection>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/emergency')}
        style={({ pressed }) => pressed && styles.pressed}>
        <AppCard style={styles.emergencyCard}>
          <View style={styles.emergencyIcon}>
            <Ionicons color={colors.danger} name="medical" size={24} />
          </View>
          <View style={styles.grow}>
            <AppText color="danger" variant="bodyStrong">
              Emergency Mode
            </AppText>
            <AppText color="inkMuted" variant="caption">
              Conditions, allergies, medications, and contacts
            </AppText>
          </View>
          <Ionicons color={colors.danger} name="chevron-forward" size={20} />
        </AppCard>
      </Pressable>
    </Screen>
  );
}

function AccountModeSwitcher({
  currentMode,
  familyName,
  isPersonal,
  onChange,
}: {
  currentMode: AccountMode;
  familyName: string;
  isPersonal: boolean;
  onChange: (mode: AccountMode) => Promise<void>;
}) {
  const [isSwitching, setIsSwitching] = useState(false);
  const effectiveMode: AccountMode = isPersonal ? 'individual' : currentMode;

  const switchMode = async (mode: AccountMode) => {
    if (mode === effectiveMode || isSwitching) return;
    setIsSwitching(true);
    try {
      await onChange(mode);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <AppCard style={styles.modeCard}>
      <View style={styles.modeCopy}>
        <AppText variant="h3">Account view</AppText>
        <AppText color="inkMuted" variant="caption">
          Switch between your private personal care space and shared family care.
        </AppText>
        <AppText color="primary" variant="caption">
          Active: {isPersonal ? 'Individual profile' : familyName}
        </AppText>
      </View>
      <View style={styles.modeToggle}>
        {(['family', 'individual'] as const).map((mode) => {
          const selected = effectiveMode === mode;
          return (
            <Pressable
              accessibilityLabel={`Switch to ${mode === 'family' ? 'Family' : 'Individual'} account`}
              accessibilityRole="button"
              accessibilityState={{ busy: isSwitching, selected }}
              disabled={isSwitching}
              key={mode}
              onPress={() => void switchMode(mode)}
              testID={`account-mode-${mode}`}
              style={[styles.modeOption, selected && styles.modeSelected]}>
              <Ionicons
                color={selected ? colors.white : colors.primary}
                name={mode === 'family' ? 'people' : 'person-circle'}
                size={17}
              />
              <AppText
                style={{ color: selected ? colors.white : colors.primary }}
                variant="caption">
                {mode === 'family' ? 'Family' : 'Individual'}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </AppCard>
  );
}

function FamilyCount({
  count,
  icon,
  label,
}: {
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.familyCountCard}>
      <Ionicons color={colors.primary} name={icon} size={18} />
      <AppText color="primary" variant="bodyStrong">
        {count}
      </AppText>
      <AppText align="center" color="inkMuted" variant="caption">
        {label}
      </AppText>
    </View>
  );
}

function FamilyMemberRow({ member }: { member: DashboardFamilyMember }) {
  const role = member.role === 'admin' ? 'Admin' : member.role === 'elder' ? 'Elder' : 'Family Member';
  const icon =
    member.role === 'admin' ? 'shield-checkmark' : member.role === 'elder' ? 'heart' : 'people';
  return (
    <View style={styles.detailRow}>
      <View style={styles.familyAvatar}>
        <AppText color="primary" variant="bodyStrong">
          {initials(member.fullName)}
        </AppText>
      </View>
      <View style={styles.grow}>
        <View style={styles.memberNameRow}>
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
          {member.email || role}
        </AppText>
      </View>
      <View style={styles.rolePill}>
        <Ionicons color={colors.primary} name={icon} size={14} />
        <AppText color="primary" variant="caption">
          {role}
        </AppText>
      </View>
    </View>
  );
}

function DashboardSection({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="h2">{title}</AppText>
        {actionLabel && onAction ? (
          <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
            <AppText color="primary" variant="caption">
              {actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <AppCard>{children}</AppCard>
    </View>
  );
}

function MedicationRow({ medication }: { medication: DashboardMedication }) {
  const completed = medication.latestStatus === 'taken';
  const needsHelp = medication.latestStatus === 'need_help';
  const status = medication.latestStatus
    ? medication.latestStatus.replace('_', ' ')
    : 'Due today';

  return (
    <View style={styles.detailRow}>
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor: needsHelp
              ? colors.dangerSoft
              : completed
                ? colors.successSoft
                : colors.primarySoft,
          },
        ]}>
        <Ionicons
          color={needsHelp ? colors.danger : completed ? colors.success : colors.primary}
          name={completed ? 'checkmark' : needsHelp ? 'alert' : 'medical'}
          size={22}
        />
      </View>
      <View style={styles.grow}>
        <AppText variant="bodyStrong">
          {medication.name} {medication.dosage}
        </AppText>
        <AppText color="inkMuted" variant="caption">
          {formatTimes(medication.scheduled_times)}
        </AppText>
      </View>
      <StatusPill
        label={status}
        tone={needsHelp ? 'danger' : completed ? 'success' : 'neutral'}
      />
    </View>
  );
}

function WellnessCard({ ping }: { ping: DashboardPing }) {
  const urgent = ping.urgency === 'urgent' || ping.response?.toLowerCase().includes('help');

  return (
    <View style={styles.wellness}>
      <View style={[styles.wellnessEmoji, urgent && styles.wellnessUrgent]}>
        <AppText style={styles.emoji}>{urgent ? '❓' : wellnessEmoji(ping.response)}</AppText>
      </View>
      <View style={styles.grow}>
        <AppText variant="h3">{ping.response ?? 'Responded'}</AppText>
        <AppText color="inkMuted" variant="caption">
          {formatRelative(ping.responded_at ?? ping.created_at)}
        </AppText>
      </View>
      <StatusPill label={urgent ? 'Needs attention' : 'Checked in'} tone={urgent ? 'danger' : 'success'} />
    </View>
  );
}

function PingRow({ ping }: { ping: DashboardPing }) {
  const urgent = ping.urgency === 'urgent';

  return (
    <View style={styles.detailRow}>
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: urgent ? colors.dangerSoft : colors.primarySoft },
        ]}>
        <Ionicons
          color={urgent ? colors.danger : colors.primary}
          name={pingIcon(ping.ping_type)}
          size={22}
        />
      </View>
      <View style={styles.grow}>
        <AppText numberOfLines={1} variant="bodyStrong">
          {ping.message}
        </AppText>
        <AppText color="inkMuted" variant="caption">
          {ping.response ? `Response: ${ping.response}` : capitalize(ping.status)} •{' '}
          {formatRelative(ping.created_at)}
        </AppText>
      </View>
    </View>
  );
}

function TaskRow({ task }: { task: DashboardTask }) {
  const urgent = task.status === 'overdue' || task.priority === 'high';

  return (
    <View style={styles.detailRow}>
      <View
        style={[
          styles.taskCheckbox,
          { borderColor: urgent ? colors.warning : colors.primary },
        ]}
      />
      <View style={styles.grow}>
        <AppText variant="bodyStrong">{task.title}</AppText>
        <AppText color={urgent ? 'warning' : 'inkMuted'} variant="caption">
          {task.status === 'overdue'
            ? 'Overdue'
            : task.due_date
              ? `Due ${formatDateTime(task.due_date)}`
              : `${capitalize(task.priority)} priority`}
        </AppText>
      </View>
    </View>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'success' | 'danger' | 'neutral';
}) {
  const palette =
    tone === 'success'
      ? { background: colors.successSoft, text: colors.success }
      : tone === 'danger'
        ? { background: colors.dangerSoft, text: colors.danger }
        : { background: colors.surfaceMuted, text: colors.inkMuted };

  return (
    <View style={[styles.pill, { backgroundColor: palette.background }]}>
      <AppText style={{ color: palette.text }} variant="caption">
        {capitalize(label)}
      </AppText>
    </View>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'there';
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatRelative(value: string) {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000),
  );
  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatTimes(times: string[]) {
  if (!times.length) return 'No time specified';
  return times
    .map((time) => {
      const [hour = '0', minute = '0'] = time.split(':');
      const date = new Date();
      date.setHours(Number(hour), Number(minute), 0, 0);
      return new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    })
    .join(' • ');
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function wellnessEmoji(response: string | null) {
  const normalized = response?.toLowerCase() ?? '';
  if (normalized.includes('not') || normalized.includes('unwell')) return '😟';
  if (normalized.includes('okay')) return '😐';
  return '😊';
}

function pingIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type === 'medication') return 'medical';
  if (type === 'hydration') return 'water';
  if (type === 'meal') return 'restaurant';
  if (type === 'movement') return 'walk';
  if (type === 'wellness') return 'happy';
  return 'notifications';
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  topBar: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  elderCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  elderAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  elderPhoto: { borderRadius: radius.pill, height: 58, width: 58 },
  activeDot: {
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    height: 10,
    width: 10,
  },
  grow: { flex: 1, gap: 2 },
  familySummary: { flexDirection: 'row', gap: spacing.sm },
  familyCountCard: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    flex: 1,
    gap: 2,
    padding: spacing.sm,
  },
  familyAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  memberNameRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  youBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  rolePill: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  section: { gap: spacing.md },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 58,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  pill: {
    borderRadius: radius.pill,
    maxWidth: 118,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  wellness: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  wellnessEmoji: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  wellnessUrgent: { backgroundColor: colors.dangerSoft },
  emoji: { fontSize: 25, lineHeight: 31 },
  taskCheckbox: { borderRadius: 7, borderWidth: 2, height: 24, width: 24 },
  emergencyCard: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: '#F0C5C1',
    flexDirection: 'row',
    gap: spacing.md,
  },
  emergencyIcon: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  pressed: { opacity: 0.72 },
  errorIcon: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  inlineError: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  modeCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  modeCopy: { flex: 1, gap: spacing.xs },
  modeToggle: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  modeOption: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  modeSelected: { backgroundColor: colors.primary },
});
