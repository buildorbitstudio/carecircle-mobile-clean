import type { RealtimeChannel } from '@supabase/supabase-js';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store/app-store';
import { resolveCareContext } from '@/features/care-context/resolveCareContext';
import { Appointment, AppointmentContext } from './types';

export function useAppointments() {
  const { session } = useAuth();
  const {
    accountMode,
    activeElderId,
    activeFamilyId,
    setActiveElder,
    setActiveFamily,
    setRole,
  } = useAppStore();
  const [context, setContext] = useState<AppointmentContext | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
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

      const { data, error: appointmentError } = await supabase
        .from('appointments')
        .select('id, elder_profile_id, title, clinic_name, location, appointment_time, notes, reminder_minutes, status, created_at, updated_at')
        .eq('elder_profile_id', careContext.elderId)
        .order('appointment_time', { ascending: true });
      if (appointmentError) throw appointmentError;
      setActiveElder(careContext.elderId);
      setActiveFamily(careContext.familyId);
      setRole(careContext.role);
      setContext({
        familyId: careContext.familyId,
        elderId: careContext.elderId,
        elderName: careContext.elderName,
      });
      setAppointments((data ?? []) as Appointment[]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load appointments.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accountMode, activeElderId, activeFamilyId, session?.user.id, setActiveElder, setActiveFamily, setRole]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  useEffect(() => {
    if (!context?.elderId) return;
    let active = true;
    let channel: RealtimeChannel | null = null;
    try {
      const fresh = supabase.channel(`appointments-${context.elderId}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fresh.on('postgres_changes', {
        event: '*', schema: 'public', table: 'appointments',
        filter: `elder_profile_id=eq.${context.elderId}`,
      }, () => { if (active) void load(true); });
      channel = fresh;
      fresh.subscribe((status, subscriptionError) => {
        if (active && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
          console.warn('Appointment realtime subscription failed:', subscriptionError);
          setError('Live appointment updates are temporarily unavailable. Pull to refresh.');
        }
      });
    } catch (subscriptionError) {
      console.warn('Unable to start appointment realtime updates:', subscriptionError);
      setError('Live appointment updates are temporarily unavailable. Pull to refresh.');
    }
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel).catch(console.warn);
    };
  }, [context?.elderId, load]);

  return { appointments, context, error, isLoading, isRefreshing, refresh: () => load(true), retry: () => load() };
}
