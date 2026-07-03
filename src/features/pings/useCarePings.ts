import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import {
  notifyNewCarePing,
  notifyUnansweredPings,
} from '@/lib/notifications/local-notifications';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store/app-store';
import { PingType } from './ping-config';

export type CarePing = {
  id: string;
  family_id: string;
  elder_profile_id: string;
  sender_id: string;
  ping_type: PingType;
  message: string;
  status: 'sent' | 'responded' | 'unanswered' | 'escalated';
  response: string | null;
  urgency: 'normal' | 'warning' | 'urgent';
  created_at: string;
  responded_at: string | null;
  expires_at: string | null;
};

type PingContext = {
  familyId: string;
  elderId: string;
  elderName: string;
};

export function useCarePings() {
  const { session } = useAuth();
  const { activeElderId, setActiveElder } = useAppStore();
  const [context, setContext] = useState<PingContext | null>(null);
  const [pings, setPings] = useState<CarePing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!session?.user.id) return;

      if (refresh) setIsRefreshing(true);
      setError(null);

      try {
        const { data: expiredCount, error: expiryError } = await supabase.rpc(
          'refresh_unanswered_care_pings',
        );
        if (expiryError) throw expiryError;
        if (typeof expiredCount === 'number' && expiredCount > 0) {
          await notifyUnansweredPings(expiredCount);
        }

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

        const { data: pingRows, error: pingsError } = await supabase
          .from('care_pings')
          .select(
            'id, family_id, elder_profile_id, sender_id, ping_type, message, status, response, urgency, created_at, responded_at, expires_at',
          )
          .eq('elder_profile_id', elder.id)
          .order('created_at', { ascending: false })
          .limit(30);

        if (pingsError) throw pingsError;

        setActiveElder(elder.id);
        setContext({
          familyId: membership.family_id,
          elderId: elder.id,
          elderName: elder.full_name,
        });
        setPings((pingRows ?? []) as CarePing[]);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : 'Unable to load Care Pings.',
        );
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

    const channel = supabase
      .channel(`care-pings-${context.elderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'care_pings',
          filter: `elder_profile_id=eq.${context.elderId}`,
        },
        () => void load(true),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [context?.elderId, load]);

  const sendPing = async (pingType: PingType, message: string) => {
    if (!context) throw new Error('Care circle information is still loading.');

    const { data: sentPing, error: sendError } = await supabase.rpc('send_care_ping', {
      p_family_id: context.familyId,
      p_elder_profile_id: context.elderId,
      p_ping_type: pingType,
      p_message: message.trim(),
    });

    if (sendError) throw sendError;
    const pingId =
      sentPing && typeof sentPing === 'object' && 'id' in sentPing
        ? String(sentPing.id)
        : undefined;
    await notifyNewCarePing({
      elderName: context.elderName,
      message: message.trim(),
      pingId,
    });
    await load(true);
  };

  return {
    context,
    pings,
    isLoading,
    isRefreshing,
    error,
    refresh: () => load(true),
    retry: () => load(),
    sendPing,
  };
}
