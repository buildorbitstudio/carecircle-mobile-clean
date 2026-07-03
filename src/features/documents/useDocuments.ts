import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store/app-store';
import { VaultDocument } from './types';

export const DOCUMENT_BUCKET = 'carecircle-documents';

type DocumentContext = {
  familyId: string;
  elderId: string;
  elderName: string;
  isAdmin: boolean;
};

export function useDocuments() {
  const { session } = useAuth();
  const { activeElderId, setActiveElder } = useAppStore();
  const [context, setContext] = useState<DocumentContext | null>(null);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
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
          .select('family_id, role')
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

        const { data: documentRows, error: documentsError } = await supabase
          .from('documents')
          .select(
            'id, family_id, elder_profile_id, uploaded_by, document_type, file_name, storage_path, mime_type, file_size_bytes, created_at, updated_at',
          )
          .eq('elder_profile_id', elder.id)
          .order('created_at', { ascending: false });

        if (documentsError) throw documentsError;

        const uploaderIds = [
          ...new Set((documentRows ?? []).map((document) => document.uploaded_by)),
        ];
        const profilesResult = uploaderIds.length
          ? await supabase
              .from('users_profile')
              .select('id, full_name')
              .in('id', uploaderIds)
          : { data: [], error: null };
        if (profilesResult.error) throw profilesResult.error;
        const uploaderById = new Map(
          (profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]),
        );

        setActiveElder(elder.id);
        setContext({
          familyId: membership.family_id,
          elderId: elder.id,
          elderName: elder.full_name,
          isAdmin: membership.role === 'admin',
        });
        setDocuments(
          (documentRows ?? []).map((document) => ({
            ...document,
            uploaderName: uploaderById.get(document.uploaded_by) ?? null,
          })) as VaultDocument[],
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : 'Unable to load documents.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeElderId, session, setActiveElder],
  );

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!context?.elderId) return;
    const channel = supabase
      .channel(`documents-${context.elderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `elder_profile_id=eq.${context.elderId}`,
        },
        () => void load(true),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [context?.elderId, load]);

  return {
    context,
    documents,
    isLoading,
    isRefreshing,
    error,
    refresh: () => load(true),
    retry: () => load(),
  };
}
