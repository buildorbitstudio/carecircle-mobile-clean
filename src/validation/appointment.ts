import { z } from 'zod';

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export const appointmentSchema = z.object({
  title: z.string().trim().min(1, 'Enter an appointment title').max(200),
  clinicName: z.string().trim().max(200).optional(),
  location: z.string().trim().max(300).optional(),
  date: z.string().trim().refine(validDate, 'Use a valid YYYY-MM-DD date'),
  time: z.string().trim().refine(validTime, 'Use a valid 24-hour time'),
  notes: z.string().trim().max(1000).optional(),
  reminderMinutes: z.number().int().min(0),
});

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;
