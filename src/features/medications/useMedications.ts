import { useCallback, useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store/app-store';
import { resolveCareContext } from '@/features/care-context/resolveCareContext';
import { MedicationLog, MedicationWithStatus } from './types';

type MedicationContext = {
  familyId: string;
  elderId: string;
  elderName: string;
};

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

export function useMedications() {
  const { session } = useAuth();
  const {
    accountMode,
    activeElderId,
    activeFamilyId,
    setActiveElder,
    setActiveFamily,
    setRole,
  } = useAppStore();
  const [context, setContext] = useState<MedicationContext | null>(null);
  const [medications, setMedications] = useState<MedicationWithStatus[]>([]);
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

        const { data: medicationRows, error: medicationError } = await supabase
          .from('medications')
          .select(
            'id, elder_profile_id, name, dosage, instructions, frequency, scheduled_times, start_date, end_date, refill_date, active, created_at, updated_at',
          )
          .eq('elder_profile_id', careContext.elderId)
          .order('active', { ascending: false })
          .order('name', { ascending: true });

        if (medicationError) throw medicationError;

        const ids = (medicationRows ?? []).map((medication) => medication.id);
        const logsResult = ids.length
          ? await supabase
              .from('medication_logs')
              .select(
                'id, medication_id, elder_profile_id, status, response_source, notes, logged_at',
              )
              .in('medication_id', ids)
              .gte('logged_at', startOfToday())
              .order('logged_at', { ascending: false })
          : { data: [] as MedicationLog[], error: null };

        if (logsResult.error) throw logsResult.error;

        const latestLogs = new Map<string, MedicationLog>();
        for (const log of (logsResult.data ?? []) as MedicationLog[]) {
          if (!latestLogs.has(log.medication_id)) latestLogs.set(log.medication_id, log);
        }

        setActiveElder(careContext.elderId);
        setActiveFamily(careContext.familyId);
        setRole(careContext.role);
        setContext({
          familyId: careContext.familyId,
          elderId: careContext.elderId,
          elderName: careContext.elderName,
        });
        setMedications(
          (medicationRows ?? []).map((medication) => {
            const latest = latestLogs.get(medication.id);
            return {
              ...medication,
              scheduled_times: medication.scheduled_times ?? [],
              latestStatus: latest?.status ?? null,
              latestLoggedAt: latest?.logged_at ?? null,
            } as MedicationWithStatus;
          }),
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : 'Unable to load medications.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [accountMode, activeElderId, activeFamilyId, session, setActiveElder, setActiveFamily, setRole],
  );

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  useEffect(() => {
    if (!context?.elderId) return;

    let active = true;
    let medicationsChannel: RealtimeChannel | null = null;

    try {
      // Each effect execution owns a uniquely named channel. This prevents a
      // mounted list screen and a pushed add/detail screen (and React Strict
      // Mode's effect replay) from receiving the same subscribed instance.
      const channelName = [
        'medications',
        context.elderId,
        Date.now(),
        Math.random().toString(36).slice(2),
      ].join('-');
      const channel = supabase.channel(channelName);

      // Register every callback before subscribing. Supabase rejects `.on()`
      // calls made after a channel has entered the subscribed state.
      channel.on(
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
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'medication_logs',
          filter: `elder_profile_id=eq.${context.elderId}`,
        },
        () => {
          if (active) void load(true);
        },
      );

      medicationsChannel = channel;
      channel.subscribe((status, channelError) => {
        if (!active) return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Medication realtime subscription failed:', channelError);
          setError(
            'Live medication updates are temporarily unavailable. Pull to refresh to try again.',
          );
        }
      });
    } catch (subscriptionError) {
      console.warn('Unable to start medication realtime updates:', subscriptionError);
      setError(
        'Live medication updates are temporarily unavailable. Pull to refresh to try again.',
      );
    }

    return () => {
      active = false;
      if (medicationsChannel) {
        void supabase.removeChannel(medicationsChannel).catch((cleanupError: unknown) => {
          console.warn('Unable to clean up medication realtime updates:', cleanupError);
        });
      }
    };
  }, [context?.elderId, load]);

  return {
    context,
    medications,
    isLoading,
    isRefreshing,
    error,
    refresh: () => load(true),
    retry: () => load(),
  };
}
