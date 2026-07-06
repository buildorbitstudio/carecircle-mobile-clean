import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store/app-store';

export type EmergencyContact = {
  id: string;
  name: string;
  relationship: string | null;
  phone: string;
  email: string | null;
  priority: number;
};

export type EmergencyData = {
  elder: {
    id: string;
    full_name: string;
    date_of_birth: string | null;
    relationship: string | null;
    phone: string | null;
    address: string | null;
    photo_url: string | null;
    primary_doctor: string | null;
    pharmacy: string | null;
    notes: string | null;
  };
  conditions: { id: string; condition_name: string; notes: string | null }[];
  allergies: {
    id: string;
    allergy_name: string;
    severity: 'unknown' | 'mild' | 'moderate' | 'severe';
    notes: string | null;
  }[];
  medications: {
    id: string;
    name: string;
    dosage: string;
    instructions: string | null;
    frequency: string;
  }[];
  contacts: EmergencyContact[];
};

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useEmergencyData() {
  const { session } = useAuth();
  const { activeElderId, setActiveElder } = useAppStore();
  const [data, setData] = useState<EmergencyData | null>(null);
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
          .select(
            'id, full_name, date_of_birth, relationship, phone, address, photo_url, primary_doctor, pharmacy, notes',
          )
          .eq('family_id', membership.family_id)
          .order('created_at', { ascending: true });

        if (elderError) throw elderError;
        const elder = elders?.find((item) => item.id === activeElderId) ?? elders?.[0];
        if (!elder) throw new Error('No elder profile was found.');

        const today = todayKey();
        const [conditionsResult, allergiesResult, medicationsResult, contactsResult] =
          await Promise.all([
            supabase
              .from('medical_conditions')
              .select('id, condition_name, notes')
              .eq('elder_profile_id', elder.id)
              .order('condition_name'),
            supabase
              .from('allergies')
              .select('id, allergy_name, severity, notes')
              .eq('elder_profile_id', elder.id)
              .order('severity', { ascending: false }),
            supabase
              .from('medications')
              .select('id, name, dosage, instructions, frequency')
              .eq('elder_profile_id', elder.id)
              .eq('active', true)
              .lte('start_date', today)
              .or(`end_date.is.null,end_date.gte.${today}`)
              .order('name'),
            supabase
              .from('emergency_contacts')
              .select('id, name, relationship, phone, email, priority')
              .eq('elder_profile_id', elder.id)
              .order('priority'),
          ]);

        const queryError =
          conditionsResult.error ??
          allergiesResult.error ??
          medicationsResult.error ??
          contactsResult.error;
        if (queryError) throw queryError;

        setActiveElder(elder.id);
        setData({
          elder,
          conditions: conditionsResult.data ?? [],
          allergies: (allergiesResult.data ?? []) as EmergencyData['allergies'],
          medications: medicationsResult.data ?? [],
          contacts: contactsResult.data ?? [],
        });
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load emergency information.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeElderId, session, setActiveElder],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refresh: () => load(true),
    retry: () => load(),
  };
}
