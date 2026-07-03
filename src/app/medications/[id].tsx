import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  EmptyState,
  FormField,
  Screen,
} from '@/components/ui';
import {
  medicationActions,
  MedicationLog,
  MedicationStatus,
} from '@/features/medications/types';
import { useMedicationDetail } from '@/features/medications/useMedicationDetail';
import {
  cancelMedicationReminders,
  scheduleMedicationReminders,
  scheduleSnoozedMedication,
} from '@/lib/notifications/local-notifications';
import { colors, radius, spacing } from '@/theme';

const actionPalette = {
  success: { background: colors.successSoft, color: colors.success },
  warning: { background: colors.warningSoft, color: colors.warning },
  danger: { background: colors.dangerSoft, color: colors.danger },
  neutral: { background: colors.surfaceMuted, color: colors.inkMuted },
};

export default function MedicationDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const medicationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const {
    medication,
    logs,
    isLoading,
    isRefreshing,
    error,
    refresh,
    retry,
    setActive,
    logMedication,
  } = useMedicationDetail(medicationId ?? '');
  const [notes, setNotes] = useState('');
  const [activeAction, setActiveAction] = useState<MedicationStatus | null>(null);
  const [isUpdatingActive, setIsUpdatingActive] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const log = async (status: MedicationStatus, label: string) => {
    setActiveAction(status);
    setActionError(null);
    setActionSuccess(null);
    try {
      await logMedication(status, notes);
      if (status === 'snoozed' && medication) {
        await scheduleSnoozedMedication({
          medicationId: medication.id,
          medicationName: medication.name,
        });
      }
      setNotes('');
      setActionSuccess(`${medication?.name ?? 'Medication'} marked ${label.toLowerCase()}.`);
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error ? caughtError.message : 'Unable to log medication.',
      );
    } finally {
      setActiveAction(null);
    }
  };

  const toggleActive = async (value: boolean) => {
    if (!medication) return;

    setIsUpdatingActive(true);
    setActionError(null);
    try {
      await setActive(value);
      if (value) {
        await scheduleMedicationReminders({
          medicationId: medication.id,
          medicationName: medication.name,
          dosage: medication.dosage,
          scheduledTimes: medication.scheduled_times,
        });
      } else {
        await cancelMedicationReminders(medication.id);
      }
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error ? caughtError.message : 'Unable to update medication.',
      );
    } finally {
      setIsUpdatingActive(false);
    }
  };

  if (isLoading && !medication) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText color="inkMuted">Loading medication…</AppText>
      </Screen>
    );
  }

  if (error && !medication) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <Ionicons color={colors.danger} name="alert-circle" size={38} />
        <AppText align="center" variant="h2">
          Medication unavailable
        </AppText>
        <AppText align="center" color="inkMuted">
          {error}
        </AppText>
        <AppButton label="Try again" onPress={() => void retry()} />
      </Screen>
    );
  }

  if (!medication) return null;

  return (
    <Screen onRefresh={() => void refresh()} refreshing={isRefreshing}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons color={colors.primary} name="medical" size={32} />
        </View>
        <View style={styles.grow}>
          <AppText variant="h1">{medication.name}</AppText>
          <AppText color="primary" variant="h3">
            {medication.dosage}
          </AppText>
        </View>
      </View>

      <AppCard style={styles.details}>
        <DetailRow icon="repeat" label="Frequency" value={medication.frequency} />
        <View style={styles.divider} />
        <DetailRow
          icon="time"
          label="Scheduled times"
          value={formatTimes(medication.scheduled_times)}
        />
        <View style={styles.divider} />
        <DetailRow
          icon="calendar"
          label="Dates"
          value={`${formatDate(medication.start_date)}${medication.end_date ? ` – ${formatDate(medication.end_date)}` : ' onward'}`}
        />
        {medication.refill_date ? (
          <>
            <View style={styles.divider} />
            <DetailRow
              icon="bag-add"
              label="Refill date"
              value={formatDate(medication.refill_date)}
            />
          </>
        ) : null}
        {medication.instructions ? (
          <>
            <View style={styles.divider} />
            <DetailRow
              icon="document-text"
              label="Instructions"
              value={medication.instructions}
            />
          </>
        ) : null}
      </AppCard>

      <View style={styles.switchRow}>
        <View style={styles.grow}>
          <AppText variant="bodyStrong">Active medication</AppText>
          <AppText color="inkMuted" variant="caption">
            Show this medication in daily care.
          </AppText>
        </View>
        {isUpdatingActive ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Switch
            onValueChange={(value) => void toggleActive(value)}
            thumbColor={colors.white}
            trackColor={{ false: colors.border, true: colors.primary }}
            value={medication.active}
          />
        )}
      </View>

      <View style={styles.section}>
        <View>
          <AppText variant="h2">Log medication</AppText>
          <AppText color="inkMuted" variant="caption">
            Each action is added to the family health timeline.
          </AppText>
        </View>
        <FormField
          label="Note (optional)"
          onChangeText={setNotes}
          placeholder="Add context for your family"
          value={notes}
        />
        <View style={styles.actionGrid}>
          {medicationActions.map((action) => {
            const palette = actionPalette[action.tone];
            const loading = activeAction === action.status;
            return (
              <Pressable
                accessibilityRole="button"
                disabled={activeAction !== null}
                key={action.status}
                onPress={() => void log(action.status, action.label)}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: palette.background },
                  pressed && styles.pressed,
                  activeAction !== null && !loading && styles.disabled,
                ]}>
                {loading ? (
                  <ActivityIndicator color={palette.color} />
                ) : (
                  <Ionicons color={palette.color} name={action.icon} size={25} />
                )}
                <AppText align="center" style={{ color: palette.color }} variant="caption">
                  {action.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {actionError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <AppText color="danger" variant="caption">
            {actionError}
          </AppText>
        </View>
      ) : null}
      {actionSuccess ? (
        <View accessibilityRole="alert" style={styles.successBanner}>
          <AppText color="success" variant="caption">
            {actionSuccess}
          </AppText>
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="h2">Recent log</AppText>
        <AppCard>
          {logs.length ? (
            logs.map((logEntry, index) => (
              <View key={logEntry.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <LogRow log={logEntry} />
              </View>
            ))
          ) : (
            <EmptyState
              description="Medication actions will be recorded here."
              icon="time-outline"
              title="No log entries yet"
            />
          )}
        </AppCard>
      </View>
    </Screen>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons color={colors.primary} name={icon} size={21} />
      <View style={styles.grow}>
        <AppText color="inkMuted" variant="caption">
          {label}
        </AppText>
        <AppText>{value}</AppText>
      </View>
    </View>
  );
}

function LogRow({ log }: { log: MedicationLog }) {
  const action = medicationActions.find((item) => item.status === log.status);
  const palette = actionPalette[action?.tone ?? 'neutral'];

  return (
    <View style={styles.logRow}>
      <View style={[styles.logIcon, { backgroundColor: palette.background }]}>
        <Ionicons
          color={palette.color}
          name={action?.icon ?? 'ellipse'}
          size={19}
        />
      </View>
      <View style={styles.grow}>
        <AppText variant="bodyStrong">{action?.label ?? log.status}</AppText>
        <AppText color="inkMuted" variant="caption">
          {formatDateTime(log.logged_at)}
          {log.notes ? ` • ${log.notes}` : ''}
        </AppText>
      </View>
    </View>
  );
}

function formatTimes(times: string[]) {
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  hero: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    height: 66,
    justifyContent: 'center',
    width: 66,
  },
  grow: { flex: 1, gap: 2 },
  details: { gap: spacing.md },
  detailRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
  switchRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  section: { gap: spacing.md },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  action: {
    alignItems: 'center',
    borderRadius: radius.md,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 82,
    padding: spacing.md,
    width: '30.5%',
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
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
  logRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 54 },
  logIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
