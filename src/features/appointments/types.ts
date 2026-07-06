export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export type Appointment = {
  id: string;
  elder_profile_id: string;
  title: string;
  clinic_name: string | null;
  location: string | null;
  appointment_time: string;
  notes: string | null;
  reminder_minutes: number | null;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
};

export type AppointmentContext = {
  familyId: string;
  elderId: string;
  elderName: string;
};
