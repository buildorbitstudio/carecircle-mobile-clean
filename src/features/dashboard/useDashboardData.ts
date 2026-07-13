import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { notifyUnansweredPings } from '@/lib/notifications/local-notifications';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store/app-store';
import { resolveCareContext } from '@/features/care-context/resolveCareContext';

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

export type DashboardFamilyMember = {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'member' | 'elder';
  isCurrentUser: boolean;
};

export type DashboardData = {
  userName: string;
  familyId: string;
  familyName: string;
  isPersonal: boolean;
  role: 'admin' | 'member' | 'elder';
  elder: {
    id: string;
    full_name: string;
    photo_url: string | null;
    date_of_birth: string | null;
  };
  familyMembers: DashboardFamilyMember[];
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
  const {
    accountMode,
    activeElderId,
    activeFamilyId,
    setActiveElder,
    setActiveFamily,
    setRole,
  } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      const userId = session?.user.id;
      if (!userId) return;

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const { data: expiredCount, error: expiryError } = await supabase.rpc(
          'refresh_unanswered_care_pings',
        );
        if (expiryError) throw expiryError;
        if (typeof expiredCount === 'number' && expiredCount > 0) {
          await notifyUnansweredPings(expiredCount);
        }
        const { error: overdueTasksError } = await supabase.rpc(
          'refresh_overdue_care_tasks',
        );
        if (overdueTasksError) throw overdueTasksError;

        const [profileResult, careContext] = await Promise.all([
          supabase
            .from('users_profile')
            .select('full_name')
            .eq('id', userId)
            .maybeSingle(),
          resolveCareContext({
            accountMode,
            activeElderId,
            activeFamilyId,
            userId,
          }),
        ]);

        if (profileResult.error) throw profileResult.error;

        const familyId = careContext.familyId;
        const [elderResult, familyMembersResult] = await Promise.all([
          supabase
            .from('elder_profiles')
            .select('id, full_name, photo_url, date_of_birth')
            .eq('id', careContext.elderId)
            .single(),
          supabase
            .from('family_members')
            .select('id, user_id, role, created_at')
            .eq('family_id', familyId)
            .eq('status', 'active')
            .order('created_at', { ascending: true }),
        ]);

        if (elderResult.error) throw elderResult.error;
        if (familyMembersResult.error) throw familyMembersResult.error;

        const elder = elderResult.data;

        const familyMemberUserIds = (familyMembersResult.data ?? []).map(
          (member) => member.user_id,
        );
        const familyProfilesResult = familyMemberUserIds.length
          ? await supabase
              .from('users_profile')
              .select('id, full_name, email')
              .in('id', familyMemberUserIds)
          : { data: [], error: null };

        if (familyProfilesResult.error) throw familyProfilesResult.error;

        const profileById = new Map(
          (familyProfilesResult.data ?? []).map((profile) => [profile.id, profile]),
        );

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

        setActiveElder(careContext.elderId);
        setActiveFamily(careContext.familyId);
        setRole(careContext.role);
        setData({
          userName:
            profileResult.data?.full_name ??
            String(session.user.user_metadata.full_name ?? 'there'),
          familyId,
          familyName: careContext.familyName,
          isPersonal: careContext.isPersonal,
          role: careContext.role,
          elder,
          familyMembers: (familyMembersResult.data ?? []).map((member) => {
            const profile = profileById.get(member.user_id);
            return {
              id: member.id,
              email: profile?.email ?? '',
              fullName: profile?.full_name ?? profile?.email ?? 'Family member',
              isCurrentUser: member.user_id === userId,
              role: member.role,
            } as DashboardFamilyMember;
          }),
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
    [accountMode, activeElderId, activeFamilyId, session, setActiveElder, setActiveFamily, setRole],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!data?.elder.id) return;

    const channel = supabase
      .channel(`dashboard-care-pings-${data.elder.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'care_pings',
          filter: `elder_profile_id=eq.${data.elder.id}`,
        },
        () => void load(true),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medications',
          filter: `elder_profile_id=eq.${data.elder.id}`,
        },
        () => void load(true),
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'medication_logs',
          filter: `elder_profile_id=eq.${data.elder.id}`,
        },
        () => void load(true),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'care_tasks',
          filter: `elder_profile_id=eq.${data.elder.id}`,
        },
        () => void load(true),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [data?.elder.id, load]);

  return {
    data,
    error,
    isLoading,
    isRefreshing,
    refresh: () => load(true),
    retry: () => load(),
  };
}
