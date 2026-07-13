import type { RealtimeChannel } from '@supabase/supabase-js';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store/app-store';
import { resolveCareContext } from '@/features/care-context/resolveCareContext';

export type CareCalendarMedication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  scheduled_times: string[];
  start_date: string;
  end_date: string | null;
  active: boolean;
};

export type CareCalendarAppointment = {
  id: string;
  title: string;
  clinic_name: string | null;
  location: string | null;
  appointment_time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
};

export type CareCalendarTask = {
  id: string;
  title: string;
  assignedName: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'overdue';
};

type CalendarContext = {
  familyId: string;
  elderId: string;
  elderName: string;
};

export function useCareCalendarItems() {
  const { session } = useAuth();
  const {
    accountMode,
    activeElderId,
    activeFamilyId,
    setActiveElder,
    setActiveFamily,
    setRole,
  } = useAppStore();
  const [context, setContext] = useState<CalendarContext | null>(null);
  const [medications, setMedications] = useState<CareCalendarMedication[]>([]);
  const [appointments, setAppointments] = useState<CareCalendarAppointment[]>([]);
  const [tasks, setTasks] = useState<CareCalendarTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!session?.user.id) return;
      if (refresh) setIsRefreshing(true);
      setError(null);

      try {
        const careContext = await resolveCareContext({
          accountMode,
          activeElderId,
          activeFamilyId,
          userId: session.user.id,
        });

        const [medicationResult, appointmentResult, tasksResult, membersResult] =
          await Promise.all([
            supabase
              .from('medications')
              .select(
                'id, name, dosage, frequency, scheduled_times, start_date, end_date, active',
              )
              .eq('elder_profile_id', careContext.elderId)
              .eq('active', true)
              .order('name', { ascending: true }),
            supabase
              .from('appointments')
              .select('id, title, clinic_name, location, appointment_time, status')
              .eq('elder_profile_id', careContext.elderId)
              .neq('status', 'cancelled')
              .order('appointment_time', { ascending: true }),
            supabase
              .from('care_tasks')
              .select('id, title, assigned_to, due_date, priority, status')
              .eq('elder_profile_id', careContext.elderId)
              .order('due_date', { ascending: true, nullsFirst: false }),
            supabase
              .from('family_members')
              .select('user_id')
              .eq('family_id', careContext.familyId)
              .eq('status', 'active'),
          ]);

        if (medicationResult.error) throw medicationResult.error;
        if (appointmentResult.error) throw appointmentResult.error;
        if (tasksResult.error) throw tasksResult.error;
        if (membersResult.error) throw membersResult.error;

        const memberIds = (membersResult.data ?? []).map((member) => member.user_id);
        const profilesResult = memberIds.length
          ? await supabase
              .from('users_profile')
              .select('id, full_name, email')
              .in('id', memberIds)
          : { data: [], error: null };

        if (profilesResult.error) throw profilesResult.error;

        const profileById = new Map(
          (profilesResult.data ?? []).map((profile) => [
            profile.id,
            profile.full_name ?? profile.email ?? 'Family member',
          ]),
        );

        setActiveElder(careContext.elderId);
        setActiveFamily(careContext.familyId);
        setRole(careContext.role);
        setContext({
          elderId: careContext.elderId,
          elderName: careContext.elderName,
          familyId: careContext.familyId,
        });
        setMedications(
          (medicationResult.data ?? []).map((medication) => ({
            ...medication,
            scheduled_times: medication.scheduled_times ?? [],
          })) as CareCalendarMedication[],
        );
        setAppointments((appointmentResult.data ?? []) as CareCalendarAppointment[]);
        setTasks(
          (tasksResult.data ?? []).map((task) => ({
            ...task,
            assignedName: task.assigned_to ? profileById.get(task.assigned_to) ?? null : null,
          })) as CareCalendarTask[],
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : 'Unable to load calendar items.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [accountMode, activeElderId, activeFamilyId, session?.user.id, setActiveElder, setActiveFamily, setRole],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!context?.elderId) return;

    let active = true;
    let channel: RealtimeChannel | null = null;

    try {
      const name = [
        'care-calendar',
        context.elderId,
        Date.now(),
        Math.random().toString(36).slice(2),
      ].join('-');
      const freshChannel = supabase.channel(name);

      for (const table of ['medications', 'appointments', 'care_tasks']) {
        freshChannel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: `elder_profile_id=eq.${context.elderId}`,
          },
          () => {
            if (active) void load(true);
          },
        );
      }

      channel = freshChannel;
      freshChannel.subscribe((status, channelError) => {
        if (!active) return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Care calendar realtime subscription failed:', channelError);
        }
      });
    } catch (subscriptionError) {
      console.warn('Unable to start care calendar realtime updates:', subscriptionError);
    }

    return () => {
      active = false;
      if (channel) {
        void supabase.removeChannel(channel).catch((cleanupError: unknown) => {
          console.warn('Unable to clean up care calendar realtime updates:', cleanupError);
        });
      }
    };
  }, [context?.elderId, load]);

  return {
    appointments,
    context,
    error,
    isLoading,
    isRefreshing,
    medications,
    refresh: () => load(true),
    retry: () => load(),
    tasks,
  };
}
