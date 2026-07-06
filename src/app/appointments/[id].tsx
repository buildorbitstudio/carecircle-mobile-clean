import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppointmentForm } from '@/components/appointments/AppointmentForm';
import { AppButton, AppCard, AppText, FeedbackBanner, Screen, SectionHeader, StateView } from '@/components/ui';
import { recordAppointmentEvent, statusLabel, toAppointmentTime } from '@/features/appointments/appointment-service';
import { AppointmentStatus } from '@/features/appointments/types';
import { useAppointments } from '@/features/appointments/useAppointments';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';
import { AppointmentFormValues } from '@/validation/appointment';

export default function AppointmentDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { session } = useAuth();
  const { appointments, context, error, isLoading, refresh, retry } = useAppointments();
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const appointment = appointments.find((item) => item.id === id);

  if (isLoading) return <Screen><StateView count={3} state="loading" /></Screen>;
  if (error || !context || !appointment) return <Screen><StateView state="error" title="Appointment unavailable"
    description={error ?? 'This appointment may have been removed.'} actionLabel="Try again" onAction={() => void retry()} /></Screen>;

  const update = async (values: AppointmentFormValues) => {
    if (!session?.user.id) return;
    setActionError(null);
    try {
      const { error: updateError } = await supabase.from('appointments').update({
        appointment_time: toAppointmentTime(values.date, values.time), clinic_name: values.clinicName || null,
        location: values.location || null, notes: values.notes || null,
        reminder_minutes: values.reminderMinutes || null, title: values.title.trim(),
      }).eq('id', appointment.id);
      if (updateError) throw updateError;
      await event('appointment_update', 'Appointment updated', values.title);
      setSuccess('Appointment updated.');
      await refresh();
    } catch (caughtError) { setActionError(message(caughtError)); }
  };

  const setStatus = async (status: AppointmentStatus) => {
    setActionError(null);
    try {
      const { error: updateError } = await supabase.from('appointments').update({ status }).eq('id', appointment.id);
      if (updateError) throw updateError;
      await event(status === 'completed' ? 'appointment_completed' : 'appointment_cancelled',
        status === 'completed' ? 'Appointment completed' : 'Appointment cancelled', appointment.title);
      setSuccess(`Appointment marked ${statusLabel(status).toLowerCase()}.`);
      await refresh();
    } catch (caughtError) { setActionError(message(caughtError)); }
  };

  const event = (eventType: string, title: string, description: string) => {
    if (!session?.user.id) throw new Error('You must be signed in.');
    return recordAppointmentEvent({ appointmentId: appointment.id, description, elderId: context.elderId,
      eventType, familyId: context.familyId, title, userId: session.user.id });
  };

  const remove = async () => {
    if (!session?.user.id) return;
    setActionError(null);
    try {
      await recordAppointmentEvent({ description: appointment.title, elderId: context.elderId,
        eventType: 'appointment_deleted', familyId: context.familyId, title: 'Appointment deleted', userId: session.user.id });
      const { error: deleteError } = await supabase.from('appointments').delete().eq('id', appointment.id);
      if (deleteError) throw deleteError;
      router.replace('/appointments');
    } catch (caughtError) { setActionError(message(caughtError)); }
  };

  const date = new Date(appointment.appointment_time);
  const dateValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const timeValue = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  return (
    <Screen>
      <SectionHeader title={appointment.title} description={`${context.elderName} • ${statusLabel(appointment.status)}`} />
      {actionError ? <FeedbackBanner tone="error" message={actionError} /> : null}
      {success ? <FeedbackBanner tone="success" message={success} /> : null}
      <AppointmentForm key={appointment.updated_at} defaultValues={{
        title: appointment.title, clinicName: appointment.clinic_name ?? '', location: appointment.location ?? '',
        notes: appointment.notes ?? '', date: dateValue, time: timeValue,
        reminderMinutes: appointment.reminder_minutes ?? 0,
      }} submitLabel="Save changes" onSubmit={update} />
      <AppCard>
        <AppText variant="h3">Status</AppText>
        <View style={styles.actions}>
          {appointment.status === 'scheduled' ? <AppButton label="Mark completed" onPress={() => void setStatus('completed')} variant="secondary" /> : null}
          {appointment.status !== 'cancelled' ? <AppButton label="Cancel appointment" onPress={() => void setStatus('cancelled')} variant="ghost" /> : null}
          {!confirmDelete ? <AppButton label="Delete permanently" onPress={() => setConfirmDelete(true)} variant="danger" /> : (
            <>
              <FeedbackBanner tone="warning" title="Delete this appointment?" message="This cannot be undone." />
              <AppButton label="Yes, delete" onPress={() => void remove()} variant="danger" />
              <AppButton label="Keep appointment" onPress={() => setConfirmDelete(false)} variant="ghost" />
            </>
          )}
        </View>
      </AppCard>
    </Screen>
  );
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to update appointment.';
}

const styles = StyleSheet.create({
  actions: { gap: spacing.md, marginTop: spacing.md },
});
