import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export type ElderProfileData = {
  elder: {
    id: string;
    family_id: string;
    full_name: string;
    date_of_birth: string | null;
    relationship: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
  };
  isAdmin: boolean;
  conditions: { condition_name: string }[];
  allergies: { allergy_name: string }[];
  contact: {
    name: string;
    relationship: string | null;
    phone: string;
  } | null;
};

export function useElderProfile() {
  const { session } = useAuth();
  const [data, setData] = useState<ElderProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!session?.user.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const membership = await supabase.from('family_members').select('family_id, role')
        .eq('user_id', session.user.id).eq('status', 'active').limit(1).single();
      if (membership.error) throw membership.error;
      const elder = await supabase.from('elder_profiles')
        .select('id, family_id, full_name, date_of_birth, relationship, phone, address, notes')
        .eq('family_id', membership.data.family_id).limit(1).single();
      if (elder.error) throw elder.error;
      const [conditions, allergies, contacts] = await Promise.all([
        supabase.from('medical_conditions').select('condition_name').eq('elder_profile_id', elder.data.id).order('condition_name'),
        supabase.from('allergies').select('allergy_name').eq('elder_profile_id', elder.data.id).order('allergy_name'),
        supabase.from('emergency_contacts').select('name, relationship, phone').eq('elder_profile_id', elder.data.id).order('priority').limit(1),
      ]);
      const queryError = conditions.error ?? allergies.error ?? contacts.error;
      if (queryError) throw queryError;
      setData({ elder: elder.data, isAdmin: membership.data.role === 'admin',
        conditions: conditions.data ?? [], allergies: allergies.data ?? [], contact: contacts.data?.[0] ?? null });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load elder profile.'); }
    finally { setIsLoading(false); }
  }, [session?.user.id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  return { data, error, isLoading, refresh: load, retry: load };
}
