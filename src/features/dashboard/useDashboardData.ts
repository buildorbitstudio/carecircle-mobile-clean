import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store/app-store';

export type DashboardMedication = {
  id: string;
  name: string;
  dosage: string;
  instructions: string | null;
  scheduled_times: string[];
  latestStatus: string | null;
};

export type DashboardPing = {
  id: string;
  ping_type: string;
  message: string;
  status: string;
  response: string | null;
  urgency: string;
  created_at: string;
  responded_at: string | null;
};

export type DashboardAppointment = {
  id: string;
  title: string;
  clinic_name: string | null;
  location: string | null;
  appointment_time: string;
};

export type DashboardTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
};

export type DashboardData = {
  userName: string;
  familyId: string;
  familyName: string;
  elder: {
    id: string;
    full_name: string;
    photo_url: string | null;
    date_of_birth: string | null;
  };
  medications: DashboardMedication[];
  recentPings: DashboardPing[];
  lastWellness: DashboardPing | null;
  upcomingAppointment: DashboardAppointment | null;
  openTasks: DashboardTask[];
};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useDashboardData() {
  const { session } = useAuth();
  const { activeElderId, setActiveElder, setRole } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      const userId = session?.user.id;
      if (!userId) return;

      refresh ? setIsRefreshing(true) : setIsLoading(true);
      setError(null);

      try {
        const [profileResult, membershipResult] = await Promise.all([
          supabase
            .from('users_profile')
            .select('full_name')
            .eq('id', userId)
            .maybeSingle(),
          supabase
            .from('family_members')
            .select('family_id, role')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (membershipResult.error) throw membershipResult.error;
        if (!membershipResult.data) throw new Error('No active family circle was found.');

        const familyId = membershipResult.data.family_id as string;
        const [familyResult, eldersResult] = await Promise.all([
          supabase.from('families').select('name').eq('id', familyId).single(),
          supabase
            .from('elder_profiles')
            .select('id, full_name, photo_url, date_of_birth')
            .eq('family_id', familyId)
            .order('created_at', { ascending: true }),
        ]);

        if (familyResult.error) throw familyResult.error;
        if (eldersResult.error) throw eldersResult.error;

        const elders = eldersResult.data ?? [];
        const elder =
          elders.find((item) => item.id === activeElderId) ??
          elders[0];

        if (!elder) throw new Error('No elder profile was found for this family circle.');

        const today = localDateKey();
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfTomorrow = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
        );

        const medicationsResult = await supabase
          .from('medications')
          .select('id, name, dosage, instructions, scheduled_times')
          .eq('elder_profile_id', elder.id)
          .eq('active', true)
          .lte('start_date', today)
          .or(`end_date.is.null,end_date.gte.${today}`)
          .order('name');

        if (medicationsResult.error) throw medicationsResult.error;

        const medicationIds = (medicationsResult.data ?? []).map((item) => item.id);
        const medicationLogsPromise = medicationIds.length
          ? supabase
              .from('medication_logs')
              .select('medication_id, status, logged_at')
              .in('medication_id', medicationIds)
              .gte('logged_at', startOfDay.toISOString())
              .lt('logged_at', startOfTomorrow.toISOString())
              .order('logged_at', { ascending: false })
          : Promise.resolve({ data: [], error: null });

        const [logsResult, pingsResult, wellnessResult, appointmentResult, tasksResult] =
          await Promise.all([
            medicationLogsPromise,
            supabase
              .from('care_pings')
              .select(
                'id, ping_type, message, status, response, urgency, created_at, responded_at',
              )
              .eq('elder_profile_id', elder.id)
              .order('created_at', { ascending: false })
              .limit(3),
            supabase
              .from('care_pings')
              .select(
                'id, ping_type, message, status, response, urgency, created_at, responded_at',
              )
              .eq('elder_profile_id', elder.id)
              .eq('ping_type', 'wellness')
              .eq('status', 'responded')
              .order('responded_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('appointments')
              .select('id, title, clinic_name, location, appointment_time')
              .eq('elder_profile_id', elder.id)
              .eq('status', 'scheduled')
              .gte('appointment_time', now.toISOString())
              .order('appointment_time', { ascending: true })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('care_tasks')
              .select('id, title, status, priority, due_date')
              .eq('elder_profile_id', elder.id)
              .in('status', ['pending', 'overdue'])
              .order('due_date', { ascending: true, nullsFirst: false })
              .limit(3),
          ]);

        const queryError =
          logsResult.error ??
          pingsResult.error ??
          wellnessResult.error ??
          appointmentResult.error ??
          tasksResult.error;
        if (queryError) throw queryError;

        const latestLogByMedication = new Map<string, string>();
        for (const log of logsResult.data ?? []) {
          if (!latestLogByMedication.has(log.medication_id)) {
            latestLogByMedication.set(log.medication_id, log.status);
          }
        }

        setActiveElder(elder.id);
        setRole(membershipResult.data.role);
        setData({
          userName:
            profileResult.data?.full_name ??
            String(session.user.user_metadata.full_name ?? 'there'),
          familyId,
          familyName: familyResult.data.name,
          elder,
          medications: (medicationsResult.data ?? []).map((medication) => ({
            ...medication,
            scheduled_times: medication.scheduled_times ?? [],
            latestStatus: latestLogByMedication.get(medication.id) ?? null,
          })),
          recentPings: pingsResult.data ?? [],
          lastWellness: wellnessResult.data,
          upcomingAppointment: appointmentResult.data,
          openTasks: tasksResult.data ?? [],
        });
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load the family dashboard.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeElderId, session, setActiveElder, setRole],
  );

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  return {
    data,
    error,
    isLoading,
    isRefreshing,
    refresh: () => load(true),
    retry: () => load(),
  };
}
