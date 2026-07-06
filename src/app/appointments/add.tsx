import { router } from 'expo-router';
import { useState } from 'react';

import { AppointmentForm } from '@/components/appointments/AppointmentForm';
import { FeedbackBanner, Screen, SectionHeader, StateView } from '@/components/ui';
import { recordAppointmentEvent, toAppointmentTime } from '@/features/appointments/appointment-service';
import { useAppointments } from '@/features/appointments/useAppointments';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { AppointmentFormValues } from '@/validation/appointment';

function tomorrow() {
  const date = new Date(); date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function AddAppointmentScreen() {
  const { session } = useAuth();
  const { context, error, isLoading, retry } = useAppointments();
  const [submitError, setSubmitError] = useState<string | null>(null);
  if (isLoading) return <Screen><StateView count={2} state="loading" /></Screen>;
  if (error || !context) return <Screen><StateView state="error" title="Unable to add appointment" description={error ?? 'Appointment context is unavailable.'} actionLabel="Try again" onAction={() => void retry()} /></Screen>;

  const submit = async (values: AppointmentFormValues) => {
    if (!session?.user.id) return;
    setSubmitError(null);
    try {
      const { data, error: insertError } = await supabase.from('appointments').insert({
        appointment_time: toAppointmentTime(values.date, values.time), clinic_name: values.clinicName || null,
        created_by: session.user.id, elder_profile_id: context.elderId, location: values.location || null,
        notes: values.notes || null, reminder_minutes: values.reminderMinutes || null,
        status: 'scheduled', title: values.title.trim(),
      }).select('id').single();
      if (insertError) throw insertError;
      await recordAppointmentEvent({ appointmentId: data.id, description: values.title, elderId: context.elderId,
        eventType: 'appointment_created', familyId: context.familyId, title: 'Appointment created', userId: session.user.id });
      router.replace({
        pathname: '/appointments/[id]',
        params: { id: data.id },
      } as never);
    } catch (caughtError) {
      setSubmitError(caughtError instanceof Error ? caughtError.message : 'Unable to save appointment.');
    }
  };

  return <Screen><SectionHeader title="New appointment" description={`Add a visit for ${context.elderName}.`} />
    {submitError ? <FeedbackBanner tone="error" message={submitError} /> : null}
    <AppointmentForm defaultValues={{ title: '', clinicName: '', location: '', notes: '', date: tomorrow(), time: '10:00', reminderMinutes: 30 }}
      submitLabel="Save appointment" onSubmit={submit} /></Screen>;
}
