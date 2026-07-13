import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppCard, AppText, EmptyState, StateView } from '@/components/ui';
import {
  CareCalendarAppointment,
  CareCalendarMedication,
  CareCalendarTask,
} from '@/features/calendar/useCareCalendarItems';
import { colors, radius, spacing } from '@/theme';

type CalendarItem =
  | {
      id: string;
      type: 'medication';
      title: string;
      subtitle: string;
      timeLabel: string;
      route: '/medications/[id]';
    }
  | {
      id: string;
      type: 'appointment';
      title: string;
      subtitle: string;
      timeLabel: string;
      route: '/appointments/[id]';
    }
  | {
      id: string;
      type: 'task';
      title: string;
      subtitle: string;
      timeLabel: string;
      route: '/tasks/[id]';
    };

type CareCalendarViewProps = {
  appointments: CareCalendarAppointment[];
  error: string | null;
  isLoading: boolean;
  medications: CareCalendarMedication[];
  onRetry: () => void;
  tasks: CareCalendarTask[];
};

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CareCalendarView({
  appointments,
  error,
  isLoading,
  medications,
  onRetry,
  tasks,
}: CareCalendarViewProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const selectedKey = localDateKey(selectedDate);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const itemsByDate = useMemo(
    () => buildItemsByDate({ appointments, medications, month: visibleMonth, tasks }),
    [appointments, medications, tasks, visibleMonth],
  );
  const selectedItems = itemsByDate.get(selectedKey) ?? [];

  if (isLoading) {
    return <StateView count={3} state="loading" />;
  }

  if (error) {
    return (
      <StateView
        actionLabel="Try again"
        description={error}
        onAction={onRetry}
        state="error"
        title="Calendar unavailable"
      />
    );
  }

  return (
    <View style={styles.container}>
      <AppCard style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Pressable
            accessibilityLabel="Previous month"
            accessibilityRole="button"
            onPress={() => setVisibleMonth(addMonths(visibleMonth, -1))}
            style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}>
            <Ionicons color={colors.primary} name="chevron-back" size={22} />
          </Pressable>
          <View style={styles.monthTitle}>
            <AppText align="center" variant="h2">
              {formatMonth(visibleMonth)}
            </AppText>
            <AppText align="center" color="inkMuted" variant="caption">
              Tap a date to see care items below
            </AppText>
          </View>
          <Pressable
            accessibilityLabel="Next month"
            accessibilityRole="button"
            onPress={() => setVisibleMonth(addMonths(visibleMonth, 1))}
            style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}>
            <Ionicons color={colors.primary} name="chevron-forward" size={22} />
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {weekdays.map((weekday) => (
            <AppText align="center" color="inkMuted" key={weekday} style={styles.weekday} variant="caption">
              {weekday}
            </AppText>
          ))}
        </View>

        <View style={styles.grid}>
          {calendarDays.map((day) => {
            const key = localDateKey(day.date);
            const isSelected = key === selectedKey;
            const isToday = key === localDateKey(new Date());
            const hasItems = Boolean(itemsByDate.get(key)?.length);

            return (
              <Pressable
                accessibilityLabel={`${formatFullDate(day.date)}${hasItems ? ', has care items' : ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={key}
                onPress={() => setSelectedDate(day.date)}
                style={({ pressed }) => [
                  styles.dayCell,
                  !day.inMonth && styles.outsideMonth,
                  isToday && styles.todayCell,
                  isSelected && styles.selectedCell,
                  pressed && styles.pressed,
                ]}>
                <AppText
                  align="center"
                  color={isSelected ? 'primary' : day.inMonth ? 'ink' : 'inkMuted'}
                  variant="bodyStrong">
                  {day.date.getDate()}
                </AppText>
                <View style={styles.dotRow}>
                  {hasItems ? <View style={[styles.dot, isSelected && styles.selectedDot]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      <AppCard style={styles.floatingPanel}>
        <View style={styles.panelHeader}>
          <View>
            <AppText variant="h2">{formatPanelDate(selectedDate)}</AppText>
            <AppText color="inkMuted" variant="caption">
              {selectedItems.length
                ? `${selectedItems.length} item${selectedItems.length === 1 ? '' : 's'} assigned`
                : 'Nothing assigned for this date'}
            </AppText>
          </View>
          <View style={styles.countPill}>
            <AppText color="primary" variant="caption">
              {selectedItems.length}
            </AppText>
          </View>
        </View>

        {selectedItems.length ? (
          selectedItems.map((item, index) => (
            <View key={`${item.type}-${item.id}-${index}`}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <CalendarItemRow item={item} />
            </View>
          ))
        ) : (
          <EmptyState
            description="Medication times, appointments, and task due dates will appear here."
            icon="calendar-outline"
            title="A quiet care day"
          />
        )}
      </AppCard>
    </View>
  );
}

function CalendarItemRow({ item }: { item: CalendarItem }) {
  const palette = itemPalette(item.type);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: item.route, params: { id: item.id } })}
      style={({ pressed }) => [styles.itemRow, pressed && styles.pressed]}>
      <View style={[styles.itemIcon, { backgroundColor: palette.background }]}>
        <Ionicons color={palette.color} name={palette.icon} size={20} />
      </View>
      <View style={styles.grow}>
        <AppText variant="bodyStrong">{item.title}</AppText>
        <AppText color="inkMuted" variant="caption">
          {item.timeLabel}
          {item.subtitle ? ` • ${item.subtitle}` : ''}
        </AppText>
      </View>
      <Ionicons color={colors.inkMuted} name="chevron-forward" size={19} />
    </Pressable>
  );
}

function buildItemsByDate({
  appointments,
  medications,
  month,
  tasks,
}: {
  appointments: CareCalendarAppointment[];
  medications: CareCalendarMedication[];
  month: Date;
  tasks: CareCalendarTask[];
}) {
  const map = new Map<string, CalendarItem[]>();
  const monthDays = buildDaysInMonth(month);

  for (const day of monthDays) {
    const key = localDateKey(day);
    for (const medication of medications) {
      if (!isMedicationActiveOnDate(medication, day)) continue;
      const times = medication.scheduled_times.length ? medication.scheduled_times : [''];
      for (const time of times) {
        pushItem(map, key, {
          id: medication.id,
          route: '/medications/[id]',
          subtitle: [medication.dosage, medication.frequency].filter(Boolean).join(' • '),
          timeLabel: time ? formatTime(time) : 'Medication',
          title: medication.name,
          type: 'medication',
        });
      }
    }
  }

  for (const appointment of appointments) {
    const key = localDateKey(new Date(appointment.appointment_time));
    pushItem(map, key, {
      id: appointment.id,
      route: '/appointments/[id]',
      subtitle: appointment.clinic_name ?? appointment.location ?? '',
      timeLabel: formatTimeFromDate(appointment.appointment_time),
      title: appointment.title,
      type: 'appointment',
    });
  }

  for (const task of tasks) {
    if (!task.due_date) continue;
    const key = localDateKey(new Date(task.due_date));
    pushItem(map, key, {
      id: task.id,
      route: '/tasks/[id]',
      subtitle: [task.assignedName ?? 'Unassigned', `${capitalize(task.priority)} priority`, capitalize(task.status)]
        .filter(Boolean)
        .join(' • '),
      timeLabel: 'Task due',
      title: task.title,
      type: 'task',
    });
  }

  for (const [key, items] of map) {
    map.set(key, items.sort(compareCalendarItems));
  }

  return map;
}

function pushItem(map: Map<string, CalendarItem[]>, key: string, item: CalendarItem) {
  const existing = map.get(key) ?? [];
  existing.push(item);
  map.set(key, existing);
}

function compareCalendarItems(a: CalendarItem, b: CalendarItem) {
  const order = { medication: 0, appointment: 1, task: 2 };
  return order[a.type] - order[b.type] || a.timeLabel.localeCompare(b.timeLabel);
}

function isMedicationActiveOnDate(medication: CareCalendarMedication, date: Date) {
  if (!medication.active) return false;
  const key = localDateKey(date);
  if (key < medication.start_date) return false;
  if (medication.end_date && key > medication.end_date) return false;
  return true;
}

function buildCalendarDays(month: Date) {
  const first = startOfMonth(month);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date,
      inMonth: date.getMonth() === first.getMonth(),
    };
  });
}

function buildDaysInMonth(month: Date) {
  const first = startOfMonth(month);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return Array.from({ length: days }, (_, index) => addDays(first, index));
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatPanelDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatTimeFromDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function itemPalette(type: CalendarItem['type']) {
  if (type === 'appointment') {
    return { background: colors.accentSoft, color: colors.accent, icon: 'calendar' as const };
  }
  if (type === 'task') {
    return { background: colors.primarySoft, color: colors.primary, icon: 'checkbox' as const };
  }
  return { background: colors.successSoft, color: colors.success, icon: 'medical' as const };
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  calendarCard: { gap: spacing.lg },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  monthTitle: { flex: 1, gap: spacing.xs },
  weekdayRow: { flexDirection: 'row' },
  weekday: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  dayCell: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 54,
    paddingVertical: spacing.xs,
    width: `${100 / 7}%`,
  },
  outsideMonth: { opacity: 0.36 },
  todayCell: { borderColor: colors.primary },
  selectedCell: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  dotRow: { height: 10, justifyContent: 'center' },
  dot: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 6,
    width: 6,
  },
  selectedDot: { backgroundColor: colors.primary },
  floatingPanel: {
    borderColor: colors.primary,
    gap: spacing.md,
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  countPill: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  itemRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 64 },
  itemIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  grow: { flex: 1, gap: 2 },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  pressed: { opacity: 0.7 },
});
