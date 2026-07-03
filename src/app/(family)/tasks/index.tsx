import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { CareTask } from '@/features/tasks/types';
import { useCareTasks } from '@/features/tasks/useCareTasks';
import { colors, radius, spacing } from '@/theme';

export default function TasksScreen() {
  const { context, tasks, isLoading, isRefreshing, error, refresh, retry } = useCareTasks();
  const openTasks = tasks.filter((task) => task.status !== 'completed');
  const completedTasks = tasks.filter((task) => task.status === 'completed');

  if (isLoading && !context) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText color="inkMuted">Loading family tasks…</AppText>
      </Screen>
    );
  }

  if (error && !context) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <Ionicons color={colors.danger} name="cloud-offline" size={36} />
        <AppText align="center" variant="h2">
          We couldn’t load tasks
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
        description={`Coordinate everyday care for ${context?.elderName ?? 'your loved one'}.`}
        title="Family Tasks"
      />
      <AppButton label="Add care task" onPress={() => router.push('/tasks/add')} />

      <View style={styles.summary}>
        <SummaryCard count={openTasks.length} label="Open" tone="primary" />
        <SummaryCard
          count={openTasks.filter((task) => task.status === 'overdue').length}
          label="Overdue"
          tone="danger"
        />
        <SummaryCard count={completedTasks.length} label="Completed" tone="success" />
      </View>

      {error ? (
        <View accessibilityRole="alert" style={styles.warningBanner}>
          <AppText color="warning" variant="caption">
            Some tasks may be out of date. Pull down to retry.
          </AppText>
        </View>
      ) : null}

      <TaskSection
        emptyDescription="Create a task when your family needs to coordinate care."
        emptyTitle="No open tasks"
        tasks={openTasks}
        title={`Open tasks (${openTasks.length})`}
      />

      {completedTasks.length ? (
        <TaskSection
          emptyDescription=""
          emptyTitle=""
          tasks={completedTasks}
          title={`Completed (${completedTasks.length})`}
        />
      ) : null}
    </Screen>
  );
}

function SummaryCard({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: 'primary' | 'danger' | 'success';
}) {
  const palette =
    tone === 'danger'
      ? { background: colors.dangerSoft, text: colors.danger }
      : tone === 'success'
        ? { background: colors.successSoft, text: colors.success }
        : { background: colors.primarySoft, text: colors.primary };

  return (
    <View style={[styles.summaryCard, { backgroundColor: palette.background }]}>
      <AppText style={{ color: palette.text }} variant="h2">
        {count}
      </AppText>
      <AppText style={{ color: palette.text }} variant="caption">
        {label}
      </AppText>
    </View>
  );
}

function TaskSection({
  title,
  tasks,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  tasks: CareTask[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="h2">{title}</AppText>
      <AppCard>
        {tasks.length ? (
          tasks.map((task, index) => (
            <View key={task.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <TaskRow task={task} />
            </View>
          ))
        ) : (
          <EmptyState
            description={emptyDescription}
            icon="checkmark-circle-outline"
            title={emptyTitle}
          />
        )}
      </AppCard>
    </View>
  );
}

function TaskRow({ task }: { task: CareTask }) {
  const status = statusPalette(task.status);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
      style={({ pressed }) => [styles.taskRow, pressed && styles.pressed]}>
      <View style={[styles.taskIcon, { backgroundColor: status.background }]}>
        <Ionicons color={status.color} name={status.icon} size={21} />
      </View>
      <View style={styles.grow}>
        <AppText variant="bodyStrong">{task.title}</AppText>
        <AppText color="inkMuted" variant="caption">
          {task.assignedName ?? 'Unassigned'}
          {task.due_date ? ` • ${formatDueDate(task.due_date)}` : ''}
        </AppText>
        <AppText color={task.priority === 'high' ? 'warning' : 'inkMuted'} variant="caption">
          {capitalize(task.priority)} priority
        </AppText>
      </View>
      <View style={[styles.statusPill, { backgroundColor: status.background }]}>
        <AppText style={{ color: status.color }} variant="caption">
          {capitalize(task.status)}
        </AppText>
      </View>
    </Pressable>
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

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
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
  summary: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    padding: spacing.md,
  },
  section: { gap: spacing.md },
  taskRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 68 },
  taskIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  grow: { flex: 1, gap: 2 },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  pressed: { opacity: 0.65 },
  warningBanner: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
