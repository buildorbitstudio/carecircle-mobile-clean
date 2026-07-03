import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  EmptyState,
  FormField,
  Screen,
  SectionHeader,
} from '@/components/ui';
import {
  severityFilters,
  TimelineSeverity,
  timelineTypeFilters,
} from '@/features/timeline/timeline-config';
import { TimelineEvent, useHealthTimeline } from '@/features/timeline/useHealthTimeline';
import { colors, radius, spacing } from '@/theme';

export default function TimelineScreen() {
  const {
    context,
    events,
    typeFilter,
    setTypeFilter,
    severityFilter,
    setSeverityFilter,
    isLoading,
    isRefreshing,
    error,
    refresh,
    retry,
    addManualNote,
  } = useHealthTimeline();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [noteSeverity, setNoteSeverity] = useState<TimelineSeverity>('normal');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const saveNote = async () => {
    if (!noteTitle.trim()) {
      setNoteError('Enter a title for the health note.');
      return;
    }

    setIsSavingNote(true);
    setNoteError(null);
    try {
      await addManualNote(noteTitle, noteDescription, noteSeverity);
      setNoteTitle('');
      setNoteDescription('');
      setNoteSeverity('normal');
      setShowNoteForm(false);
    } catch (caughtError) {
      setNoteError(
        caughtError instanceof Error ? caughtError.message : 'Unable to add the health note.',
      );
    } finally {
      setIsSavingNote(false);
    }
  };

  if (isLoading && !context) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText color="inkMuted">Loading health timeline…</AppText>
      </Screen>
    );
  }

  if (error && !context) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <Ionicons color={colors.danger} name="cloud-offline" size={38} />
        <AppText align="center" variant="h2">
          Timeline unavailable
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
        description={`A shared history of care activity for ${context?.elderName ?? 'your loved one'}.`}
        title="Health Timeline"
      />

      <AppButton
        label={showNoteForm ? 'Cancel health note' : 'Add health note'}
        onPress={() => {
          setShowNoteForm((visible) => !visible);
          setNoteError(null);
        }}
        variant={showNoteForm ? 'ghost' : 'secondary'}
      />

      {showNoteForm ? (
        <AppCard style={styles.noteForm}>
          <AppText variant="h3">Manual health note</AppText>
          <FormField
            label="Title"
            maxLength={200}
            onChangeText={setNoteTitle}
            placeholder="e.g. Blood pressure looked good"
            value={noteTitle}
          />
          <FormField
            label="Details (optional)"
            multiline
            onChangeText={setNoteDescription}
            placeholder="Add useful context for your family"
            style={styles.noteInput}
            textAlignVertical="top"
            value={noteDescription}
          />
          <View style={styles.fieldGroup}>
            <AppText variant="caption">Severity</AppText>
            <View style={styles.severityRow}>
              {(['normal', 'warning', 'urgent'] as TimelineSeverity[]).map((severity) => (
                <FilterChip
                  key={severity}
                  label={capitalize(severity)}
                  onPress={() => setNoteSeverity(severity)}
                  selected={noteSeverity === severity}
                  tone={severity}
                />
              ))}
            </View>
          </View>
          {noteError ? (
            <View accessibilityRole="alert" style={styles.noteError}>
              <AppText color="danger" variant="caption">
                {noteError}
              </AppText>
            </View>
          ) : null}
          <AppButton
            label="Save health note"
            loading={isSavingNote}
            onPress={() => void saveNote()}
          />
        </AppCard>
      ) : null}

      <View style={styles.filters}>
        <AppText variant="bodyStrong">Event type</AppText>
        <ScrollView
          contentContainerStyle={styles.filterScroll}
          horizontal
          showsHorizontalScrollIndicator={false}>
          {timelineTypeFilters.map((filter) => (
            <FilterChip
              icon={filter.icon}
              key={filter.value}
              label={filter.label}
              onPress={() => setTypeFilter(filter.value)}
              selected={typeFilter === filter.value}
            />
          ))}
        </ScrollView>

        <AppText variant="bodyStrong">Severity</AppText>
        <ScrollView
          contentContainerStyle={styles.filterScroll}
          horizontal
          showsHorizontalScrollIndicator={false}>
          {severityFilters.map((filter) => (
            <FilterChip
              key={filter.value}
              label={filter.label}
              onPress={() => setSeverityFilter(filter.value)}
              selected={severityFilter === filter.value}
              tone={filter.value === 'all' ? undefined : filter.value}
            />
          ))}
        </ScrollView>
      </View>

      {error ? (
        <View accessibilityRole="alert" style={styles.warningBanner}>
          <AppText color="warning" variant="caption">
            Some timeline events may be out of date. Pull down to retry.
          </AppText>
        </View>
      ) : null}

      <View style={styles.timeline}>
        {events.length ? (
          events.map((event, index) => {
            const previous = events[index - 1];
            const showDate =
              !previous || dateKey(previous.created_at) !== dateKey(event.created_at);
            return (
              <View key={event.id}>
                {showDate ? (
                  <AppText color="inkMuted" style={styles.dateHeading} variant="caption">
                    {dateHeading(event.created_at)}
                  </AppText>
                ) : null}
                <TimelineItem event={event} isLast={index === events.length - 1} />
              </View>
            );
          })
        ) : (
          <AppCard>
            <EmptyState
              description="Try another filter, or add a manual health note."
              icon="pulse-outline"
              title="No matching events"
            />
          </AppCard>
        )}
      </View>
    </Screen>
  );
}

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const visual = eventVisual(event);
  const severity = severityPalette(event.severity);

  return (
    <View style={styles.eventRow}>
      <View style={styles.rail}>
        <View style={[styles.eventIcon, { backgroundColor: severity.background }]}>
          <Ionicons color={severity.color} name={visual.icon} size={20} />
        </View>
        {!isLast ? <View style={styles.line} /> : null}
      </View>
      <AppCard style={styles.eventCard}>
        <View style={styles.eventTop}>
          <View style={styles.eventTitle}>
            <AppText variant="bodyStrong">{event.title}</AppText>
            <AppText color="inkMuted" variant="caption">
              {visual.label} • {formatTime(event.created_at)}
            </AppText>
          </View>
          {event.severity !== 'normal' ? (
            <View style={[styles.severityBadge, { backgroundColor: severity.background }]}>
              <AppText style={{ color: severity.color }} variant="caption">
                {capitalize(event.severity)}
              </AppText>
            </View>
          ) : null}
        </View>
        {event.description ? (
          <AppText color="inkMuted" variant="caption">
            {event.description}
          </AppText>
        ) : null}
      </AppCard>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
  icon,
  tone,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: TimelineSeverity;
}) {
  const toneColors = tone ? severityPalette(tone) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.filterChip,
        selected && {
          backgroundColor: toneColors?.background ?? colors.primarySoft,
          borderColor: toneColors?.color ?? colors.primary,
        },
      ]}>
      {icon ? (
        <Ionicons
          color={selected ? colors.primary : colors.inkMuted}
          name={icon}
          size={17}
        />
      ) : null}
      <AppText
        style={selected && toneColors ? { color: toneColors.color } : undefined}
        color={selected && !toneColors ? 'primaryDark' : 'inkMuted'}
        variant="caption">
        {label}
      </AppText>
    </Pressable>
  );
}

function eventVisual(event: TimelineEvent): {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
} {
  if (event.event_type.startsWith('care_ping')) {
    return {
      icon: event.event_type === 'care_ping_response' ? 'chatbubble-ellipses' : 'notifications',
      label: event.event_type === 'care_ping_response' ? 'Care Ping response' : 'Care Ping',
    };
  }
  if (event.event_type.startsWith('medication')) {
    const missed = event.title.toLowerCase().includes('missed');
    return { icon: missed ? 'close-circle' : 'medical', label: 'Medication' };
  }
  if (event.event_type.includes('task')) {
    return { icon: 'checkbox', label: 'Task' };
  }
  if (event.event_type.includes('appointment')) {
    return { icon: 'calendar', label: 'Appointment' };
  }
  if (event.event_type === 'emergency_alert') {
    return { icon: 'warning', label: 'Emergency alert' };
  }
  if (event.event_type === 'manual_health_note') {
    return { icon: 'document-text', label: 'Health note' };
  }
  return { icon: 'pulse', label: 'Health update' };
}

function severityPalette(severity: TimelineSeverity) {
  if (severity === 'urgent') {
    return { background: colors.dangerSoft, color: colors.danger };
  }
  if (severity === 'warning') {
    return { background: colors.warningSoft, color: colors.warning };
  }
  return { background: colors.primarySoft, color: colors.primary };
}

function dateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dateHeading(value: string) {
  const eventDate = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dateKey(value) === dateKey(today.toISOString())) return 'Today';
  if (dateKey(value) === dateKey(yesterday.toISOString())) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(eventDate);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
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
  noteForm: { gap: spacing.lg },
  noteInput: { minHeight: 100, paddingTop: spacing.md },
  fieldGroup: { gap: spacing.sm },
  severityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  noteError: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  filters: { gap: spacing.md },
  filterScroll: { gap: spacing.sm, paddingRight: spacing.xl },
  filterChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  warningBanner: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  timeline: { gap: spacing.sm },
  dateHeading: { marginBottom: spacing.md, marginTop: spacing.md },
  eventRow: { alignItems: 'stretch', flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 42 },
  eventIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
    zIndex: 1,
  },
  line: { backgroundColor: colors.border, flex: 1, width: 2 },
  eventCard: { flex: 1, gap: spacing.sm, marginBottom: spacing.md },
  eventTop: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  eventTitle: { flex: 1, gap: 2 },
  severityBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
