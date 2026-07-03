import { z } from 'zod';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidDate(value: string) {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseScheduledTimes(value: string) {
  return value
    .split(',')
    .map((time) => time.trim())
    .filter(Boolean);
}

export const medicationSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter the medication name').max(160),
    dosage: z.string().trim().min(1, 'Enter the dosage').max(120),
    instructions: z.string().trim().max(1000).optional(),
    frequency: z.string().trim().min(1, 'Enter a frequency').max(120),
    scheduledTimes: z
      .string()
      .trim()
      .min(1, 'Enter at least one scheduled time')
      .refine(
        (value) => parseScheduledTimes(value).every((time) => timePattern.test(time)),
        'Use 24-hour HH:MM times separated by commas',
      ),
    startDate: z.string().trim().refine(isValidDate, 'Use a valid YYYY-MM-DD date'),
    endDate: z
      .string()
      .trim()
      .refine((value) => value === '' || isValidDate(value), 'Use a valid YYYY-MM-DD date'),
    refillDate: z
      .string()
      .trim()
      .refine((value) => value === '' || isValidDate(value), 'Use a valid YYYY-MM-DD date'),
    active: z.boolean(),
  })
  .refine(
    (values) => !values.endDate || values.endDate >= values.startDate,
    { message: 'End date must be on or after the start date', path: ['endDate'] },
  );

export type MedicationFormValues = z.infer<typeof medicationSchema>;
