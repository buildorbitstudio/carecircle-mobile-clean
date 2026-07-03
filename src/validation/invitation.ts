import { z } from 'zod';

export const invitationSchema = z.object({
  email: z.email('Enter a valid email address'),
  role: z.enum(['admin', 'member', 'elder']),
});

export type InvitationValues = z.infer<typeof invitationSchema>;
