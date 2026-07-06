import { Ionicons } from '@expo/vector-icons';

export type TimelineSeverity = 'normal' | 'warning' | 'urgent';
export type TimelineSeverityFilter = 'all' | TimelineSeverity;
export type TimelineTypeFilter =
  | 'all'
  | 'care_pings'
  | 'medications'
  | 'tasks'
  | 'appointments'
  | 'emergency'
  | 'notes';

export const timelineTypeFilters: {
  value: TimelineTypeFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  eventTypes?: string[];
}[] = [
  { value: 'all', label: 'All events', icon: 'list' },
  {
    value: 'care_pings',
    label: 'Care Pings',
    icon: 'notifications',
    eventTypes: ['care_ping_sent', 'care_ping_response', 'care_ping_unanswered'],
  },
  {
    value: 'medications',
    label: 'Medications',
    icon: 'medical',
    eventTypes: ['medication_log', 'medication_taken', 'medication_missed'],
  },
  {
    value: 'tasks',
    label: 'Tasks',
    icon: 'checkbox',
    eventTypes: ['task_completed', 'task_update', 'care_task_completed'],
  },
  {
    value: 'appointments',
    label: 'Appointments',
    icon: 'calendar',
    eventTypes: [
      'appointment_update',
      'appointment_created',
      'appointment_completed',
      'appointment_cancelled',
      'appointment_deleted',
    ],
  },
  {
    value: 'emergency',
    label: 'Emergency',
    icon: 'warning',
    eventTypes: ['emergency_alert'],
  },
  {
    value: 'notes',
    label: 'Notes',
    icon: 'document-text',
    eventTypes: ['manual_health_note'],
  },
];

export const severityFilters: { value: TimelineSeverityFilter; label: string }[] = [
  { value: 'all', label: 'All severity' },
  { value: 'normal', label: 'Normal' },
  { value: 'warning', label: 'Warning' },
  { value: 'urgent', label: 'Urgent' },
];
