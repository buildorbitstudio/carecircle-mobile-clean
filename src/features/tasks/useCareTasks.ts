import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store/app-store';
import { CareTask, FamilyAssignee } from './types';

type TaskContext = {
  familyId: string;
  elderId: string;
  elderName: string;
};

export function useCareTasks() {
  const { session } = useAuth();
  const { activeElderId, setActiveElder } = useAppStore();
  const [context, setContext] = useState<TaskContext | null>(null);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [members, setMembers] = useState<FamilyAssignee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!session?.user.id) return;
      if (refresh) setIsRefreshing(true);
      setError(null);

      try {
        const { error: overdueError } = await supabase.rpc('refresh_overdue_care_tasks');
        if (overdueError) throw overdueError;

        const { data: membership, error: membershipError } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (membershipError) throw membershipError;
        if (!membership) throw new Error('No active family circle was found.');

        const [eldersResult, membershipsResult] = await Promise.all([
          supabase
            .from('elder_profiles')
            .select('id, full_name')
            .eq('family_id', membership.family_id)
            .order('created_at', { ascending: true }),
          supabase
            .from('family_members')
            .select('user_id, role')
            .eq('family_id', membership.family_id)
            .eq('status', 'active'),
        ]);

        if (eldersResult.error) throw eldersResult.error;
        if (membershipsResult.error) throw membershipsResult.error;
        const elder =
          eldersResult.data?.find((item) => item.id === activeElderId) ??
          eldersResult.data?.[0];
        if (!elder) throw new Error('No elder profile was found.');

        const memberIds = (membershipsResult.data ?? []).map((member) => member.user_id);
        const [tasksResult, profilesResult] = await Promise.all([
          supabase
            .from('care_tasks')
            .select(
              'id, family_id, elder_profile_id, title, description, assigned_to, due_date, priority, status, created_by, created_at, completed_at, updated_at',
            )
            .eq('elder_profile_id', elder.id)
            .order('status', { ascending: false })
            .order('due_date', { ascending: true, nullsFirst: false })
            .limit(100),
          memberIds.length
            ? supabase
                .from('users_profile')
                .select('id, full_name, email')
                .in('id', memberIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (tasksResult.error) throw tasksResult.error;
        if (profilesResult.error) throw profilesResult.error;

        const profileById = new Map(
          (profilesResult.data ?? []).map((profile) => [profile.id, profile]),
        );
        const assignees = (membershipsResult.data ?? []).map((member) => {
          const profile = profileById.get(member.user_id);
          return {
            userId: member.user_id,
            fullName: profile?.full_name ?? profile?.email ?? 'Family member',
            email: profile?.email ?? '',
            role: member.role,
          } as FamilyAssignee;
        });
        const nameById = new Map(assignees.map((member) => [member.userId, member.fullName]));

        setActiveElder(elder.id);
        setContext({
          familyId: membership.family_id,
          elderId: elder.id,
          elderName: elder.full_name,
        });
        setMembers(assignees);
        setTasks(
          (tasksResult.data ?? []).map((task) => ({
            ...task,
            assignedName: task.assigned_to ? nameById.get(task.assigned_to) ?? null : null,
          })) as CareTask[],
        );
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load tasks.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeElderId, session, setActiveElder],
  );

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  useEffect(() => {
    if (!context?.elderId) return;

    let active = true;
    let tasksChannel: RealtimeChannel | null = null;

    try {
      // A unique name guarantees that a mounted list and a pushed add screen,
      // as well as React Strict Mode's effect replay, never share an already
      // subscribed Supabase channel instance.
      const channelName = [
        'care-tasks',
        context.elderId,
        Date.now(),
        Math.random().toString(36).slice(2),
      ].join('-');
      const channel = supabase.channel(channelName);

      // All database callbacks must be attached before subscribe is called.
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'care_tasks',
          filter: `elder_profile_id=eq.${context.elderId}`,
        },
        () => {
          if (active) void load(true);
        },
      );

      tasksChannel = channel;
      channel.subscribe((status, channelError) => {
        if (!active) return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Task realtime subscription failed:', channelError);
          setError(
            'Live task updates are temporarily unavailable. Pull to refresh to try again.',
          );
        }
      });
    } catch (subscriptionError) {
      console.warn('Unable to start task realtime updates:', subscriptionError);
      setError(
        'Live task updates are temporarily unavailable. Pull to refresh to try again.',
      );
    }

    return () => {
      active = false;
      if (tasksChannel) {
        void supabase.removeChannel(tasksChannel).catch((cleanupError: unknown) => {
          console.warn('Unable to clean up task realtime updates:', cleanupError);
        });
      }
    };
  }, [context?.elderId, load]);

  return {
    context,
    tasks,
    members,
    isLoading,
    isRefreshing,
    error,
    refresh: () => load(true),
    retry: () => load(),
  };
}
