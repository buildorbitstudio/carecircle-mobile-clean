import type { RealtimeChannel } from '@supabase/supabase-js';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store/app-store';

export type ScheduleMedication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  scheduled_times: string[];
};

export type ScheduleAppointment = {
  id: string;
  title: string;
  clinic_name: string | null;
  location: string | null;
  appointment_time: string;
  notes: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
};

type ScheduleContext = {
  elderId: string;
  elderName: string;
};

export function useScheduleData() {
  const { session } = useAuth();
  const { activeElderId, setActiveElder } = useAppStore();
  const [context, setContext] = useState<ScheduleContext | null>(null);
  const [medications, setMedications] = useState<ScheduleMedication[]>([]);
  const [appointments, setAppointments] = useState<ScheduleAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!session?.user.id) return;
      if (refresh) setIsRefreshing(true);
      setError(null);

      try {
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

        const { data: elders, error: elderError } = await supabase
          .from('elder_profiles')
          .select('id, full_name')
          .eq('family_id', membership.family_id)
          .order('created_at', { ascending: true });
        if (elderError) throw elderError;

        const elder = elders?.find((item) => item.id === activeElderId) ?? elders?.[0];
        if (!elder) throw new Error('No elder profile was found.');

        const [medicationResult, appointmentResult] = await Promise.all([
          supabase
            .from('medications')
            .select('id, name, dosage, frequency, scheduled_times')
            .eq('elder_profile_id', elder.id)
            .eq('active', true)
            .order('name', { ascending: true }),
          supabase
            .from('appointments')
            .select('id, title, clinic_name, location, appointment_time, notes, status')
            .eq('elder_profile_id', elder.id)
            .neq('status', 'cancelled')
            .order('appointment_time', { ascending: true }),
        ]);
        if (medicationResult.error) throw medicationResult.error;
        if (appointmentResult.error) throw appointmentResult.error;

        setActiveElder(elder.id);
        setContext({ elderId: elder.id, elderName: elder.full_name });
        setMedications(
          (medicationResult.data ?? []).map((medication) => ({
            ...medication,
            scheduled_times: medication.scheduled_times ?? [],
          })) as ScheduleMedication[],
        );
        setAppointments((appointmentResult.data ?? []) as ScheduleAppointment[]);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : 'Unable to load the schedule.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeElderId, session?.user.id, setActiveElder],
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
        'schedule',
        context.elderId,
        Date.now(),
        Math.random().toString(36).slice(2),
      ].join('-');
      const freshChannel = supabase.channel(name);
      freshChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medications',
          filter: `elder_profile_id=eq.${context.elderId}`,
        },
        () => {
          if (active) void load(true);
        },
      );
      freshChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `elder_profile_id=eq.${context.elderId}`,
        },
        () => {
          if (active) void load(true);
        },
      );
      channel = freshChannel;
      freshChannel.subscribe((status, channelError) => {
        if (!active) return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Schedule realtime subscription failed:', channelError);
        }
      });
    } catch (subscriptionError) {
      console.warn('Unable to start schedule realtime updates:', subscriptionError);
    }

    return () => {
      active = false;
      if (channel) {
        void supabase.removeChannel(channel).catch((cleanupError: unknown) => {
          console.warn('Unable to clean up schedule realtime updates:', cleanupError);
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
  };
}
