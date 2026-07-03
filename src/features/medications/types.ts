import { Ionicons } from '@expo/vector-icons';

export type MedicationStatus = 'taken' | 'skipped' | 'snoozed' | 'missed' | 'need_help';

export type Medication = {
  id: string;
  elder_profile_id: string;
  name: string;
  dosage: string;
  instructions: string | null;
  frequency: string;
  scheduled_times: string[];
  start_date: string;
  end_date: string | null;
  refill_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MedicationLog = {
  id: string;
  medication_id: string;
  elder_profile_id: string;
  status: MedicationStatus;
  response_source: 'reminder' | 'care_ping' | 'manual';
  notes: string | null;
  logged_at: string;
};

export type MedicationWithStatus = Medication & {
  latestStatus: MedicationStatus | null;
  latestLoggedAt: string | null;
};

export const medicationActions: {
  status: MedicationStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
}[] = [
  { status: 'taken', label: 'Taken', icon: 'checkmark', tone: 'success' },
  { status: 'skipped', label: 'Skipped', icon: 'play-skip-forward', tone: 'warning' },
  { status: 'snoozed', label: 'Snoozed', icon: 'time', tone: 'neutral' },
  { status: 'missed', label: 'Missed', icon: 'close', tone: 'warning' },
  { status: 'need_help', label: 'Need Help', icon: 'help', tone: 'danger' },
];
