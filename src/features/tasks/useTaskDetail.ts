import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { CareTask } from './types';

export function useTaskDetail(taskId: string) {
  const [task, setTask] = useState<CareTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!taskId) return;
      if (refresh) setIsRefreshing(true);
      setError(null);

      try {
        const { data: taskRow, error: taskError } = await supabase
          .from('care_tasks')
          .select(
            'id, family_id, elder_profile_id, title, description, assigned_to, due_date, priority, status, created_by, created_at, completed_at, updated_at',
          )
          .eq('id', taskId)
          .maybeSingle();

        if (taskError) throw taskError;
        if (!taskRow) throw new Error('Care task not found.');

        let assignedName: string | null = null;
        if (taskRow.assigned_to) {
          const { data: profile, error: profileError } = await supabase
            .from('users_profile')
            .select('full_name')
            .eq('id', taskRow.assigned_to)
            .maybeSingle();
          if (profileError) throw profileError;
          assignedName = profile?.full_name ?? null;
        }

        setTask({ ...taskRow, assignedName } as CareTask);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : 'Unable to load task details.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [taskId],
  );

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!taskId) return;
    const channel = supabase
      .channel(`care-task-${taskId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'care_tasks', filter: `id=eq.${taskId}` },
        () => void load(true),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, taskId]);

  const complete = async () => {
    const { error: completeError } = await supabase.rpc('complete_care_task', {
      p_task_id: taskId,
    });
    if (completeError) throw completeError;
    await load(true);
  };

  return {
    task,
    isLoading,
    isRefreshing,
    error,
    refresh: () => load(true),
    retry: () => load(),
    complete,
  };
}
