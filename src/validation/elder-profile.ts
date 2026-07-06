import { z } from 'zod';

export const elderProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the elder full name').max(120),
  dateOfBirth: z.string()
    .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Use YYYY-MM-DD')
    .refine((value) => value === '' || !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Enter a valid date')
    .refine((value) => value === '' || new Date(`${value}T00:00:00Z`) <= new Date(), 'Date of birth cannot be in the future'),
  relationship: z.string().max(80),
  phone: z.string().max(40),
  address: z.string().max(300),
  conditions: z.string().max(1000),
  allergies: z.string().max(1000),
  contactName: z.string().max(120),
  contactRelationship: z.string().max(80),
  contactPhone: z.string().max(40),
  notes: z.string().max(2000),
}).superRefine((values, context) => {
  if (values.contactName.trim() && !values.contactPhone.trim()) {
    context.addIssue({
      code: 'custom',
      message: 'Enter the emergency contact phone number',
      path: ['contactPhone'],
    });
  }
  if (values.contactPhone.trim() && !values.contactName.trim()) {
    context.addIssue({
      code: 'custom',
      message: 'Enter the emergency contact name',
      path: ['contactName'],
    });
  }
});
export type ElderProfileFormValues = z.infer<typeof elderProfileSchema>;
