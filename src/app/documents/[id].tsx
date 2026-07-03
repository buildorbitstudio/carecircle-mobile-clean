import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, Screen } from '@/components/ui';
import { documentTypeConfig } from '@/features/documents/document-config';
import { useDocumentDetail } from '@/features/documents/useDocumentDetail';
import { colors, radius, spacing } from '@/theme';

export default function DocumentDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const documentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const {
    document,
    isAdmin,
    isLoading,
    error,
    retry,
    createOpenUrl,
    deleteDocument,
  } = useDocumentDetail(documentId ?? '');
  const [isOpening, setIsOpening] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const openDocument = async () => {
    setIsOpening(true);
    setActionError(null);
    try {
      const signedUrl = await createOpenUrl();
      const supported = await Linking.canOpenURL(signedUrl);
      if (!supported) throw new Error('This file cannot be opened on this device.');
      await Linking.openURL(signedUrl);
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error ? caughtError.message : 'Unable to open the document.',
      );
    } finally {
      setIsOpening(false);
    }
  };

  const performDelete = async () => {
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteDocument();
      router.replace('/documents');
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error ? caughtError.message : 'Unable to delete the document.',
      );
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete document?',
      'This permanently removes the file from the family vault. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void performDelete() },
      ],
    );
  };

  if (isLoading && !document) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText color="inkMuted">Loading document…</AppText>
      </Screen>
    );
  }

  if (error && !document) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <Ionicons color={colors.danger} name="document-lock" size={42} />
        <AppText align="center" variant="h2">
          Document unavailable
        </AppText>
        <AppText align="center" color="inkMuted">
          {error}
        </AppText>
        <AppButton label="Try again" onPress={() => void retry()} />
      </Screen>
    );
  }

  if (!document) return null;
  const config = documentTypeConfig(document.document_type);

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons color={colors.primary} name={config.icon} size={38} />
        </View>
        <AppText align="center" numberOfLines={3} variant="h1">
          {document.file_name}
        </AppText>
        <View style={styles.typeBadge}>
          <AppText color="primary" variant="caption">
            {config.label}
          </AppText>
        </View>
      </View>

      <AppButton
        label="Open document"
        loading={isOpening}
        onPress={() => void openDocument()}
      />

      <View style={styles.privateNotice}>
        <Ionicons color={colors.primary} name="time" size={20} />
        <AppText color="inkMuted" style={styles.grow} variant="caption">
          Opening creates a private link that expires after 60 seconds.
        </AppText>
      </View>

      <AppCard style={styles.details}>
        <DetailRow icon="document-text" label="File type" value={document.mime_type ?? 'Unknown'} />
        <View style={styles.divider} />
        <DetailRow
          icon="server"
          label="File size"
          value={
            document.file_size_bytes
              ? formatFileSize(document.file_size_bytes)
              : 'Not available'
          }
        />
        <View style={styles.divider} />
        <DetailRow
          icon="person"
          label="Uploaded by"
          value={document.uploaderName ?? 'Family member'}
        />
        <View style={styles.divider} />
        <DetailRow
          icon="calendar"
          label="Uploaded"
          value={formatDateTime(document.created_at)}
        />
      </AppCard>

      {actionError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <AppText color="danger" variant="caption">
            {actionError}
          </AppText>
        </View>
      ) : null}

      {isAdmin ? (
        <AppButton
          label="Delete document"
          loading={isDeleting}
          onPress={confirmDelete}
          variant="danger"
        />
      ) : (
        <AppText align="center" color="inkMuted" variant="caption">
          Only a family admin can delete documents.
        </AppText>
      )}
    </Screen>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons color={colors.primary} name={icon} size={21} />
      <View style={styles.grow}>
        <AppText color="inkMuted" variant="caption">
          {label}
        </AppText>
        <AppText>{value}</AppText>
      </View>
    </View>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  hero: { alignItems: 'center', gap: spacing.md },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    height: 82,
    justifyContent: 'center',
    width: 82,
  },
  typeBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  privateNotice: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  grow: { flex: 1, gap: 2 },
  details: { gap: spacing.md },
  detailRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
