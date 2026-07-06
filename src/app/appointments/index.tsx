import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, EmptyState, Screen, SectionHeader, StateView } from '@/components/ui';
import { statusLabel } from '@/features/appointments/appointment-service';
import { Appointment } from '@/features/appointments/types';
import { useAppointments } from '@/features/appointments/useAppointments';
import { colors, radius, spacing } from '@/theme';

export default function AppointmentsListScreen() {
  const { appointments, context, error, isLoading, isRefreshing, refresh, retry } = useAppointments();
  if (isLoading) return <Screen><SectionHeader title="Appointments" description="Visits and family reminders." /><StateView count={3} state="loading" /></Screen>;
  if (error) return <Screen><SectionHeader title="Appointments" description="Visits and family reminders." /><StateView state="error" title="Appointments unavailable" description={error} actionLabel="Try again" onAction={() => void retry()} /></Screen>;

  return (
    <Screen onRefresh={() => void refresh()} refreshing={isRefreshing}>
      <SectionHeader title="Appointments" description={`Visits and reminders for ${context?.elderName ?? 'your loved one'}.`} />
      <AppButton label="Add appointment" onPress={() => router.push('/appointments/add' as never)} />
      {appointments.length ? appointments.map((appointment) => (
        <AppointmentRow appointment={appointment} key={appointment.id} />
      )) : (
        <AppCard><EmptyState icon="calendar-outline" title="No appointments scheduled"
          description="Add a visit so everyone knows when and where care is happening."
          actionLabel="Add" onAction={() => router.push('/appointments/add' as never)} /></AppCard>
      )}
    </Screen>
  );
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const cancelled = appointment.status === 'cancelled';
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({
      pathname: '/appointments/[id]',
      params: { id: appointment.id },
    } as never)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.grow}>
        <AppText variant="h3">{appointment.title}</AppText>
        <AppText color="inkMuted">{appointment.clinic_name || 'Provider not specified'}</AppText>
        <AppText color="primary" variant="caption">{formatDate(appointment.appointment_time)}</AppText>
      </View>
      <View style={[styles.badge, cancelled && styles.cancelled]}>
        <AppText color={cancelled ? 'danger' : 'primary'} variant="caption">{statusLabel(appointment.status)}</AppText>
      </View>
    </Pressable>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border,
    borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.xl },
  grow: { flex: 1, gap: spacing.xs },
  badge: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  cancelled: { backgroundColor: colors.dangerSoft },
  pressed: { opacity: 0.76 },
});
