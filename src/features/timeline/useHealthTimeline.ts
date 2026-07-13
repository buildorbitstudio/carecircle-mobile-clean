import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store/app-store';
import { resolveCareContext } from '@/features/care-context/resolveCareContext';
import {
  TimelineSeverity,
  TimelineSeverityFilter,
  timelineTypeFilters,
  TimelineTypeFilter,
} from './timeline-config';

export type TimelineEvent = {
  id: string;
  family_id: string;
  elder_profile_id: string;
  event_type: string;
  title: string;
  description: string | null;
  severity: TimelineSeverity;
  created_by: string | null;
  source_table: string | null;
  source_id: string | null;
  created_at: string;
};

type TimelineContext = {
  familyId: string;
  elderId: string;
  elderName: string;
};

export function useHealthTimeline() {
  const { session } = useAuth();
  const {
    accountMode,
    activeElderId,
    activeFamilyId,
    setActiveElder,
    setActiveFamily,
    setRole,
  } = useAppStore();
  const [context, setContext] = useState<TimelineContext | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [typeFilter, setTypeFilter] = useState<TimelineTypeFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<TimelineSeverityFilter>('all');
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

        let query = supabase
          .from('health_timeline_events')
          .select(
            'id, family_id, elder_profile_id, event_type, title, description, severity, created_by, source_table, source_id, created_at',
          )
          .eq('elder_profile_id', careContext.elderId)
          .order('created_at', { ascending: false })
          .limit(100);

        const selectedType = timelineTypeFilters.find((filter) => filter.value === typeFilter);
        if (selectedType?.eventTypes) {
          query = query.in('event_type', selectedType.eventTypes);
        }
        if (severityFilter !== 'all') {
          query = query.eq('severity', severityFilter);
        }

        const { data: eventRows, error: eventsError } = await query;
        if (eventsError) throw eventsError;

        setActiveElder(careContext.elderId);
        setActiveFamily(careContext.familyId);
        setRole(careContext.role);
        setContext({
          familyId: careContext.familyId,
          elderId: careContext.elderId,
          elderName: careContext.elderName,
        });
        setEvents((eventRows ?? []) as TimelineEvent[]);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load the health timeline.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [accountMode, activeElderId, activeFamilyId, session, setActiveElder, setActiveFamily, setRole, severityFilter, typeFilter],
  );

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  useEffect(() => {
    if (!context?.elderId) return;

    const channel = supabase
      .channel(`health-timeline-${context.elderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_timeline_events',
          filter: `elder_profile_id=eq.${context.elderId}`,
        },
        () => void load(true),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [context?.elderId, load]);

  const addManualNote = async (
    title: string,
    description: string,
    severity: TimelineSeverity,
  ) => {
    if (!context) throw new Error('Elder profile is still loading.');

    const { error: noteError } = await supabase.rpc('add_manual_health_note', {
      p_elder_profile_id: context.elderId,
      p_title: title.trim(),
      p_description: description.trim() || null,
      p_severity: severity,
    });
    if (noteError) throw noteError;
    await load(true);
  };

  return {
    context,
    events,
    typeFilter,
    setTypeFilter,
    severityFilter,
    setSeverityFilter,
    isLoading,
    isRefreshing,
    error,
    refresh: () => load(true),
    retry: () => load(),
    addManualNote,
  };
}
