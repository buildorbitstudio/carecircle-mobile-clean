import { z } from 'zod';

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Enter a task title').max(200),
  description: z.string().trim().max(1000).optional(),
  assignedTo: z.string(),
  dueDate: z.string().trim().refine(isValidDate, 'Use a valid YYYY-MM-DD date'),
  priority: z.enum(['low', 'medium', 'high']),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
