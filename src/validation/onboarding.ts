import { z } from 'zod';

export const fullNameSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
});

export const accountTypeSchema = z.object({
  accountType: z.enum(['individual', 'family']),
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

export const personalProfileSchema = z.object({
  dateOfBirth: z
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
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(240).optional(),
  primaryDoctor: z.string().trim().max(160).optional(),
  pharmacy: z.string().trim().max(160).optional(),
  emergencyContactName: z.string().trim().max(120).optional(),
  emergencyContactRelationship: z.string().trim().max(80).optional(),
  emergencyContactPhone: z.string().trim().max(40).optional(),
});

export type FullNameValues = z.infer<typeof fullNameSchema>;
export type AccountTypeValues = z.infer<typeof accountTypeSchema>;
export type FamilyValues = z.infer<typeof familySchema>;
export type ElderValues = z.infer<typeof elderSchema>;
export type PersonalProfileValues = z.infer<typeof personalProfileSchema>;
