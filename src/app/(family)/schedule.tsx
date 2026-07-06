import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  EmptyState,
  Screen,
  SectionHeader,
  StateView,
} from '@/components/ui';
import {
  ScheduleAppointment,
  ScheduleMedication,
  useScheduleData,
} from '@/features/schedule/useScheduleData';
import { colors, radius, spacing } from '@/theme';

export default function ScheduleScreen() {
  const {
    appointments,
    error,
    isLoading,
    isRefreshing,
    medications,
    refresh,
    retry,
  } = useScheduleData();

  if (isLoading) {
    return (
      <Screen>
        <SectionHeader
          description="Medications and appointments in one calm daily view."
          title="Schedule"
        />
        <StateView count={3} state="loading" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <SectionHeader
          description="Medications and appointments in one calm daily view."
          title="Schedule"
        />
        <StateView
          actionLabel="Try again"
          description={error}
          onAction={() => void retry()}
          state="error"
          title="Schedule unavailable"
        />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => void refresh()} refreshing={isRefreshing}>
      <SectionHeader
        description="Real care plans and visits shared by your family."
        title="Schedule"
      />

      <ScheduleSection
        actionLabel="Add medication"
        icon="medical"
        onAction={() => router.push('/medications/add')}
        title="Medications">
        {medications.length ? (
          medications.map((medication) => (
            <MedicationRow key={medication.id} medication={medication} />
          ))
        ) : (
          <EmptyState
            actionLabel="Add"
            description="Active medications will appear here after your family adds them."
            icon="medical-outline"
            onAction={() => router.push('/medications/add')}
            title="No medications scheduled"
          />
        )}
      </ScheduleSection>

      <ScheduleSection
        actionLabel="Add appointment"
        icon="calendar"
        onAction={() => router.push('/appointments')}
        title="Appointments">
        {appointments.length ? (
          appointments.map((appointment) => (
            <AppointmentRow appointment={appointment} key={appointment.id} />
          ))
        ) : (
          <EmptyState
            actionLabel="Add"
            description="Upcoming visits will appear here after your family adds them."
            icon="calendar-outline"
            onAction={() => router.push('/appointments')}
            title="No appointments scheduled"
          />
        )}
      </ScheduleSection>
    </Screen>
  );
}

function ScheduleSection({
  actionLabel,
  children,
  icon,
  onAction,
  title,
}: {
  actionLabel: string;
  children: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  onAction: () => void;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitle}>
          <Ionicons color={colors.primary} name={icon} size={23} />
          <AppText variant="h2">{title}</AppText>
        </View>
        <AppButton label={actionLabel} onPress={onAction} size="sm" variant="ghost" />
      </View>
      <AppCard style={styles.card}>{children}</AppCard>
    </View>
  );
}

function MedicationRow({ medication }: { medication: ScheduleMedication }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons color={colors.primary} name="medical" size={20} />
      </View>
      <View style={styles.grow}>
        <AppText variant="bodyStrong">{medication.name}</AppText>
        <AppText color="inkMuted" variant="caption">
          {[medication.dosage, medication.frequency, formatTimes(medication.scheduled_times)]
            .filter(Boolean)
            .join(' • ')}
        </AppText>
      </View>
    </View>
  );
}

function AppointmentRow({ appointment }: { appointment: ScheduleAppointment }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons color={colors.primary} name="calendar" size={20} />
      </View>
      <View style={styles.grow}>
        <AppText variant="bodyStrong">{appointment.title}</AppText>
        <AppText color="inkMuted" variant="caption">
          {formatDateTime(appointment.appointment_time)}
          {appointment.clinic_name ? ` • ${appointment.clinic_name}` : ''}
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  sectionTitle: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  card: { gap: spacing.lg },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  grow: { flex: 1, gap: spacing.xs },
});
