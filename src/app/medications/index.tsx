import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { MedicationWithStatus } from '@/features/medications/types';
import { useMedications } from '@/features/medications/useMedications';
import { colors, radius, spacing } from '@/theme';

export default function MedicationsScreen() {
  const { context, medications, isLoading, isRefreshing, error, refresh, retry } =
    useMedications();
  const active = medications.filter((medication) => medication.active);
  const inactive = medications.filter((medication) => !medication.active);

  if (isLoading && !context) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText color="inkMuted">Loading medications…</AppText>
      </Screen>
    );
  }

  if (error && !context) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <Ionicons color={colors.danger} name="cloud-offline" size={36} />
        <AppText align="center" variant="h2">
          We couldn’t load medications
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
        description={`Manage schedules and medication logs for ${context?.elderName ?? 'your loved one'}.`}
        title="Medications"
      />
      <AppButton
        label="Add medication"
        onPress={() => router.push('/medications/add')}
      />

      {error ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <AppText color="warning" variant="caption">
            Some information may be out of date. Pull down to retry.
          </AppText>
        </View>
      ) : null}

      <MedicationSection medications={active} title={`Active (${active.length})`} />

      {inactive.length ? (
        <MedicationSection medications={inactive} title={`Inactive (${inactive.length})`} />
      ) : null}
    </Screen>
  );
}

function MedicationSection({
  title,
  medications,
}: {
  title: string;
  medications: MedicationWithStatus[];
}) {
  return (
    <View style={styles.section}>
      <AppText variant="h2">{title}</AppText>
      <AppCard>
        {medications.length ? (
          medications.map((medication, index) => (
            <View key={medication.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <MedicationRow medication={medication} />
            </View>
          ))
        ) : (
          <EmptyState
            description="Add a medication to begin tracking its schedule."
            icon="medical-outline"
            title="No active medications"
          />
        )}
      </AppCard>
    </View>
  );
}

function MedicationRow({ medication }: { medication: MedicationWithStatus }) {
  const status = medication.latestStatus;
  const urgent = status === 'need_help';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/medications/[id]', params: { id: medication.id } })
      }
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View
        style={[
          styles.icon,
          !medication.active && styles.iconInactive,
          urgent && styles.iconUrgent,
        ]}>
        <Ionicons
          color={urgent ? colors.danger : medication.active ? colors.primary : colors.inkMuted}
          name="medical"
          size={23}
        />
      </View>
      <View style={styles.grow}>
        <AppText variant="bodyStrong">
          {medication.name} {medication.dosage}
        </AppText>
        <AppText color="inkMuted" variant="caption">
          {medication.frequency} • {formatTimes(medication.scheduled_times)}
        </AppText>
        {status ? (
          <AppText color={urgent ? 'danger' : status === 'taken' ? 'success' : 'warning'} variant="caption">
            Today: {status.replace('_', ' ')}
          </AppText>
        ) : null}
      </View>
      <Ionicons color={colors.inkMuted} name="chevron-forward" size={20} />
    </Pressable>
  );
}

function formatTimes(times: string[]) {
  if (!times.length) return 'No times';
  return times
    .map((time) => {
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    })
    .join(', ');
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  section: { gap: spacing.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 68 },
  pressed: { opacity: 0.65 },
  grow: { flex: 1, gap: 2 },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  iconInactive: { backgroundColor: colors.surfaceMuted },
  iconUrgent: { backgroundColor: colors.dangerSoft },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  errorBanner: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
