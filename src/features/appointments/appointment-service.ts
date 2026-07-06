import { supabase } from '@/lib/supabase';
import { AppointmentStatus } from './types';

type AppointmentEventInput = {
  familyId: string;
  elderId: string;
  userId: string;
  appointmentId?: string;
  eventType: string;
  title: string;
  description: string;
};

export async function recordAppointmentEvent(input: AppointmentEventInput) {
  const { error } = await supabase.from('health_timeline_events').insert({
    created_by: input.userId,
    description: input.description,
    elder_profile_id: input.elderId,
    event_type: input.eventType,
    family_id: input.familyId,
    severity: 'normal',
    source_id: input.appointmentId ?? null,
    source_table: input.appointmentId ? 'appointments' : null,
    title: input.title,
  });
  if (error) throw error;
}

export function statusLabel(status: AppointmentStatus) {
  return status === 'scheduled' ? 'Upcoming' : status === 'completed' ? 'Completed' : 'Cancelled';
}

export function toAppointmentTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}
