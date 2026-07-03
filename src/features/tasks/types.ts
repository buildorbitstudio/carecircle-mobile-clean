export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'completed' | 'overdue';

export type FamilyAssignee = {
  userId: string;
  fullName: string;
  email: string;
  role: 'admin' | 'member' | 'elder';
};

export type CareTask = {
  id: string;
  family_id: string;
  elder_profile_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  created_by: string;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
  assignedName: string | null;
};
