import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import { decode } from 'base64-arraybuffer';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, Screen, SectionHeader } from '@/components/ui';
import {
  documentTypes,
  DocumentType,
} from '@/features/documents/document-config';
import { DOCUMENT_BUCKET, useDocuments } from '@/features/documents/useDocuments';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const allowedPickerTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
];

export default function UploadDocumentScreen() {
  const { session } = useAuth();
  const { context, isLoading, error: contextError } = useDocuments();
  const [documentType, setDocumentType] = useState<DocumentType>('medical_report');
  const [asset, setAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const chooseFile = async () => {
    setUploadError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: allowedPickerTypes,
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;
    const selected = result.assets[0];
    if (selected.size && selected.size > MAX_FILE_SIZE) {
      setUploadError('Choose a file smaller than 20 MB.');
      return;
    }
    setAsset(selected);
  };

  const upload = async () => {
    if (!asset || !context || !session?.user.id) return;
    setIsUploading(true);
    setUploadError(null);

    let storagePath: string | null = null;
    try {
      const mimeType = inferMimeType(asset);
      if (!allowedPickerTypes.includes(mimeType)) {
        throw new Error('Choose a PDF, image, WebP, or text file.');
      }

      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const safeName = sanitizeFileName(asset.name);
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;
      storagePath = `${context.familyId}/${context.elderId}/${uniqueName}`;

      const { error: storageError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(storagePath, decode(base64), {
          contentType: mimeType,
          upsert: false,
          cacheControl: '3600',
        });
      if (storageError) throw storageError;

      const { data: documentRow, error: metadataError } = await supabase
        .from('documents')
        .insert({
          family_id: context.familyId,
          elder_profile_id: context.elderId,
          uploaded_by: session.user.id,
          document_type: documentType,
          file_name: asset.name,
          storage_path: storagePath,
          mime_type: mimeType,
          file_size_bytes: asset.size ?? null,
        })
        .select('id')
        .single();

      if (metadataError) {
        await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
        throw metadataError;
      }

      router.replace({
        pathname: '/documents/[id]',
        params: { id: documentRow.id },
      });
    } catch (caughtError) {
      if (storagePath) {
        const { data: metadata } = await supabase
          .from('documents')
          .select('id')
          .eq('storage_path', storagePath)
          .maybeSingle();
        if (!metadata) {
          await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
        }
      }
      setUploadError(
        caughtError instanceof Error ? caughtError.message : 'Unable to upload document.',
      );
      setIsUploading(false);
    }
  };

  return (
    <Screen>
      <SectionHeader
        description={`Add a private care document for ${context?.elderName ?? 'your loved one'}.`}
        title="Upload document"
      />

      {contextError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <AppText color="danger" variant="caption">
            {contextError}
          </AppText>
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="h3">1. Choose document type</AppText>
        <View style={styles.typeGrid}>
          {documentTypes.map((type) => {
            const selected = documentType === type.value;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={type.value}
                onPress={() => setDocumentType(type.value)}
                style={[styles.typeCard, selected && styles.typeCardSelected]}>
                <View style={[styles.typeIcon, selected && styles.typeIconSelected]}>
                  <Ionicons
                    color={selected ? colors.white : colors.primary}
                    name={type.icon}
                    size={22}
                  />
                </View>
                <AppText
                  align="center"
                  color={selected ? 'primaryDark' : 'inkMuted'}
                  variant="caption">
                  {type.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="h3">2. Select file</AppText>
        {asset ? (
          <AppCard style={styles.fileCard}>
            <View style={styles.fileIcon}>
              <Ionicons color={colors.primary} name="document" size={26} />
            </View>
            <View style={styles.grow}>
              <AppText numberOfLines={2} variant="bodyStrong">
                {asset.name}
              </AppText>
              <AppText color="inkMuted" variant="caption">
                {asset.size ? formatFileSize(asset.size) : 'File size unavailable'}
              </AppText>
            </View>
            <Pressable
              accessibilityLabel="Remove selected file"
              accessibilityRole="button"
              onPress={() => setAsset(null)}
              style={styles.removeButton}>
              <Ionicons color={colors.danger} name="close" size={22} />
            </Pressable>
          </AppCard>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => void chooseFile()}
            style={({ pressed }) => [styles.picker, pressed && styles.pressed]}>
            <View style={styles.pickerIcon}>
              <Ionicons color={colors.primary} name="cloud-upload" size={32} />
            </View>
            <AppText variant="bodyStrong">Choose a file</AppText>
            <AppText align="center" color="inkMuted" variant="caption">
              PDF, JPG, PNG, WebP, or text • Maximum 20 MB
            </AppText>
          </Pressable>
        )}
        {asset ? (
          <AppButton label="Choose a different file" onPress={() => void chooseFile()} variant="ghost" />
        ) : null}
      </View>

      {uploadError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <AppText color="danger" variant="caption">
            {uploadError}
          </AppText>
        </View>
      ) : null}

      <AppButton
        disabled={!asset || !context || isLoading}
        label="Upload securely"
        loading={isUploading}
        onPress={() => void upload()}
      />
    </Screen>
  );
}

function inferMimeType(asset: DocumentPicker.DocumentPickerAsset) {
  if (asset.mimeType) return asset.mimeType;
  const extension = asset.name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'txt') return 'text/plain';
  return 'application/octet-stream';
}

function sanitizeFileName(name: string) {
  const sanitized = name
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
  return sanitized || 'document';
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  typeCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 100,
    padding: spacing.md,
    width: '30.5%',
  },
  typeCardSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  typeIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  typeIconSelected: { backgroundColor: colors.primary },
  picker: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  pickerIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  fileCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  fileIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  grow: { flex: 1, gap: 2 },
  removeButton: { padding: spacing.sm },
  pressed: { opacity: 0.68 },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
