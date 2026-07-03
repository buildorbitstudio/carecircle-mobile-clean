import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { Medication, MedicationLog, MedicationStatus } from './types';

export function useMedicationDetail(medicationId: string) {
  const [medication, setMedication] = useState<Medication | null>(null);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!medicationId) return;
      if (refresh) setIsRefreshing(true);
      setError(null);

      try {
        const [medicationResult, logsResult] = await Promise.all([
          supabase
            .from('medications')
            .select(
              'id, elder_profile_id, name, dosage, instructions, frequency, scheduled_times, start_date, end_date, refill_date, active, created_at, updated_at',
            )
            .eq('id', medicationId)
            .maybeSingle(),
          supabase
            .from('medication_logs')
            .select(
              'id, medication_id, elder_profile_id, status, response_source, notes, logged_at',
            )
            .eq('medication_id', medicationId)
            .order('logged_at', { ascending: false })
            .limit(30),
        ]);

        if (medicationResult.error) throw medicationResult.error;
        if (logsResult.error) throw logsResult.error;
        if (!medicationResult.data) throw new Error('Medication not found.');

        setMedication({
          ...medicationResult.data,
          scheduled_times: medicationResult.data.scheduled_times ?? [],
        } as Medication);
        setLogs((logsResult.data ?? []) as MedicationLog[]);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load medication details.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [medicationId],
  );

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  useEffect(() => {
    if (!medication?.elder_profile_id) return;

    const channel = supabase
      .channel(`medication-detail-${medicationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medications', filter: `id=eq.${medicationId}` },
        () => void load(true),
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'medication_logs',
          filter: `medication_id=eq.${medicationId}`,
        },
        () => void load(true),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, medication?.elder_profile_id, medicationId]);

  const setActive = async (active: boolean) => {
    const { error: updateError } = await supabase
      .from('medications')
      .update({ active })
      .eq('id', medicationId);
    if (updateError) throw updateError;
    await load(true);
  };

  const logMedication = async (status: MedicationStatus, notes?: string) => {
    const { error: logError } = await supabase.rpc('log_medication', {
      p_medication_id: medicationId,
      p_status: status,
      p_notes: notes?.trim() || null,
    });
    if (logError) throw logError;
    await load(true);
  };

  return {
    medication,
    logs,
    isLoading,
    isRefreshing,
    error,
    refresh: () => load(true),
    retry: () => load(),
    setActive,
    logMedication,
  };
}
