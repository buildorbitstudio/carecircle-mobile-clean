import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { DOCUMENT_BUCKET } from './useDocuments';
import { VaultDocument } from './types';

export function useDocumentDetail(documentId: string) {
  const [document, setDocument] = useState<VaultDocument | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!documentId) return;
    setError(null);
    try {
      const { data: documentRow, error: documentError } = await supabase
        .from('documents')
        .select(
          'id, family_id, elder_profile_id, uploaded_by, document_type, file_name, storage_path, mime_type, file_size_bytes, created_at, updated_at',
        )
        .eq('id', documentId)
        .maybeSingle();

      if (documentError) throw documentError;
      if (!documentRow) throw new Error('Document not found.');

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const [profileResult, membershipResult] = await Promise.all([
        supabase
          .from('users_profile')
          .select('full_name')
          .eq('id', documentRow.uploaded_by)
          .maybeSingle(),
        user
          ? supabase
              .from('family_members')
              .select('role')
              .eq('family_id', documentRow.family_id)
              .eq('user_id', user.id)
              .eq('status', 'active')
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (membershipResult.error) throw membershipResult.error;
      setIsAdmin(membershipResult.data?.role === 'admin');
      setDocument({
        ...documentRow,
        uploaderName: profileResult.data?.full_name ?? null,
      } as VaultDocument);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Unable to load the document.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const createOpenUrl = async () => {
    if (!document) throw new Error('Document is still loading.');
    const { data, error: signedUrlError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(document.storage_path, 60);
    if (signedUrlError) throw signedUrlError;
    return data.signedUrl;
  };

  const deleteDocument = async () => {
    if (!document) throw new Error('Document is still loading.');
    if (!isAdmin) throw new Error('Only a family admin can delete documents.');

    const { error: storageError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .remove([document.storage_path]);
    if (storageError) throw storageError;

    const { error: metadataError } = await supabase
      .from('documents')
      .delete()
      .eq('id', document.id);
    if (metadataError) throw metadataError;
  };

  return {
    document,
    isAdmin,
    isLoading,
    error,
    retry: load,
    createOpenUrl,
    deleteDocument,
  };
}
