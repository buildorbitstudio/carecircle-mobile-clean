import { z } from 'zod';

export const fullNameSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
});

export const familySchema = z.object({
  familyName: z.string().trim().min(2, 'Enter a family circle name').max(120),
});

export const elderSchema = z.object({
  elderFullName: z.string().trim().min(2, 'Enter your loved one’s full name').max(120),
  elderDateOfBirth: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
          new Date(`${value}T00:00:00Z`) <= new Date()),
      'Use YYYY-MM-DD and enter a valid past date',
    ),
  primaryDoctor: z.string().trim().max(160).optional(),
  pharmacy: z.string().trim().max(160).optional(),
});

export type FullNameValues = z.infer<typeof fullNameSchema>;
export type FamilyValues = z.infer<typeof familySchema>;
export type ElderValues = z.infer<typeof elderSchema>;
