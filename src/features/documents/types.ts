import { DocumentType } from './document-config';

export type VaultDocument = {
  id: string;
  family_id: string;
  elder_profile_id: string;
  uploaded_by: string;
  document_type: DocumentType;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
  updated_at: string;
  uploaderName: string | null;
};
