import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  ConfirmationModal,
  Screen,
} from '@/components/ui';
import { CareTask } from '@/features/tasks/types';
import { useTaskDetail } from '@/features/tasks/useTaskDetail';
import { colors, radius, spacing } from '@/theme';

export default function TaskDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const taskId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { task, isLoading, isRefreshing, error, refresh, retry, complete } =
    useTaskDetail(taskId ?? '');
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCompletionConfirmation, setShowCompletionConfirmation] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completionSuccess, setCompletionSuccess] = useState(false);

  const completeTask = async () => {
    setIsCompleting(true);
    setCompletionError(null);
    try {
      await complete();
      setCompletionSuccess(true);
      setShowCompletionConfirmation(false);
    } catch (caughtError) {
      setCompletionError(
        caughtError instanceof Error ? caughtError.message : 'Unable to complete the task.',
      );
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading && !task) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText color="inkMuted">Loading task…</AppText>
      </Screen>
    );
  }

  if (error && !task) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <Ionicons color={colors.danger} name="alert-circle" size={38} />
        <AppText align="center" variant="h2">
          Task unavailable
        </AppText>
        <AppText align="center" color="inkMuted">
          {error}
        </AppText>
        <AppButton label="Try again" onPress={() => void retry()} />
      </Screen>
    );
  }

  if (!task) return null;

  const status = statusPalette(task.status);

  return (
    <Screen onRefresh={() => void refresh()} refreshing={isRefreshing}>
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: status.background }]}>
          <Ionicons color={status.color} name={status.icon} size={30} />
        </View>
        <View style={styles.grow}>
          <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
            <AppText style={{ color: status.color }} variant="caption">
              {capitalize(task.status)}
            </AppText>
          </View>
          <AppText variant="h1">{task.title}</AppText>
        </View>
      </View>

      {task.description ? (
        <AppCard>
          <AppText color="inkMuted" variant="caption">
            Description
          </AppText>
          <AppText>{task.description}</AppText>
        </AppCard>
      ) : null}

      <AppCard style={styles.details}>
        <DetailRow
          icon="person"
          label="Assigned to"
          value={task.assignedName ?? 'Unassigned'}
        />
        <View style={styles.divider} />
        <DetailRow
          icon="calendar"
          label="Due date"
          value={task.due_date ? formatDateTime(task.due_date) : 'No due date'}
        />
        <View style={styles.divider} />
        <DetailRow
          icon="flag"
          label="Priority"
          value={`${capitalize(task.priority)} priority`}
        />
        <View style={styles.divider} />
        <DetailRow
          icon="time"
          label="Created"
          value={formatDateTime(task.created_at)}
        />
        {task.completed_at ? (
          <>
            <View style={styles.divider} />
            <DetailRow
              icon="checkmark-circle"
              label="Completed"
              value={formatDateTime(task.completed_at)}
            />
          </>
        ) : null}
      </AppCard>

      {completionError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <AppText color="danger" variant="caption">
            {completionError}
          </AppText>
        </View>
      ) : null}
      {completionSuccess ? (
        <View accessibilityRole="alert" style={styles.successBanner}>
          <AppText color="success" variant="caption">
            Task completed and added to the health timeline.
          </AppText>
        </View>
      ) : null}

      {task.status !== 'completed' ? (
        <AppButton
          label="Complete task"
          loading={isCompleting}
          onPress={() => {
            setCompletionError(null);
            setShowCompletionConfirmation(true);
          }}
        />
      ) : (
        <View style={styles.completedCard}>
          <Ionicons color={colors.success} name="checkmark-circle" size={25} />
          <AppText color="success" variant="bodyStrong">
            This task is complete
          </AppText>
        </View>
      )}
      <ConfirmationModal
        confirmLabel="Complete Task"
        description="This will mark the task complete and add an event to the health timeline."
        error={completionError}
        loading={isCompleting}
        onCancel={() => {
          if (!isCompleting) setShowCompletionConfirmation(false);
        }}
        onConfirm={() => void completeTask()}
        title="Complete this task?"
        visible={showCompletionConfirmation}
      />
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

function statusPalette(status: CareTask['status']) {
  if (status === 'overdue') {
    return { background: colors.dangerSoft, color: colors.danger, icon: 'alert' as const };
  }
  if (status === 'completed') {
    return {
      background: colors.successSoft,
      color: colors.success,
      icon: 'checkmark' as const,
    };
  }
  return { background: colors.primarySoft, color: colors.primary, icon: 'checkbox' as const };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
    borderRadius: radius.lg,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  grow: { flex: 1, gap: 3 },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  details: { gap: spacing.md },
  detailRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
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
  completedCard: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
