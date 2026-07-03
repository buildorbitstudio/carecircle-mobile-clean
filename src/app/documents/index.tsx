import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { documentTypeConfig } from '@/features/documents/document-config';
import { VaultDocument } from '@/features/documents/types';
import { useDocuments } from '@/features/documents/useDocuments';
import { colors, radius, spacing } from '@/theme';

export default function DocumentsScreen() {
  const { context, documents, isLoading, isRefreshing, error, refresh, retry } = useDocuments();

  if (isLoading && !context) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText color="inkMuted">Opening secure vault…</AppText>
      </Screen>
    );
  }

  if (error && !context) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <Ionicons color={colors.danger} name="lock-closed" size={38} />
        <AppText align="center" variant="h2">
          Document Vault unavailable
        </AppText>
        <AppText align="center" color="inkMuted">
          {error}
        </AppText>
        <AppButton label="Try again" onPress={() => void retry()} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => void refresh()} refreshing={isRefreshing}>
      <SectionHeader
        description={`Private family access to important documents for ${context?.elderName ?? 'your loved one'}.`}
        title="Document Vault"
      />
      <View style={styles.securityNotice}>
        <Ionicons color={colors.primary} name="lock-closed" size={21} />
        <AppText color="primary" style={styles.grow} variant="caption">
          Files are stored in a private Supabase bucket and opened with temporary links.
        </AppText>
      </View>
      <AppButton label="Upload document" onPress={() => router.push('/documents/upload')} />

      {error ? (
        <View accessibilityRole="alert" style={styles.warningBanner}>
          <AppText color="warning" variant="caption">
            Some documents may be out of date. Pull down to retry.
          </AppText>
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="h2">Documents ({documents.length})</AppText>
        <AppCard>
          {documents.length ? (
            documents.map((document, index) => (
              <View key={document.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <DocumentRow document={document} />
              </View>
            ))
          ) : (
            <EmptyState
              description="Prescriptions, reports, insurance cards, and other files will appear here."
              icon="document-lock-outline"
              title="No documents uploaded"
            />
          )}
        </AppCard>
      </View>
    </Screen>
  );
}

function DocumentRow({ document }: { document: VaultDocument }) {
  const config = documentTypeConfig(document.document_type);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/documents/[id]', params: { id: document.id } })
      }
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.icon}>
        <Ionicons color={colors.primary} name={config.icon} size={23} />
      </View>
      <View style={styles.grow}>
        <AppText numberOfLines={1} variant="bodyStrong">
          {document.file_name}
        </AppText>
        <AppText color="inkMuted" variant="caption">
          {config.label} • {formatDate(document.created_at)}
        </AppText>
        {document.uploaderName ? (
          <AppText color="inkMuted" variant="caption">
            Uploaded by {document.uploaderName}
          </AppText>
        ) : null}
      </View>
      <Ionicons color={colors.inkMuted} name="chevron-forward" size={20} />
    </Pressable>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  securityNotice: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  section: { gap: spacing.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 64 },
  pressed: { opacity: 0.65 },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  grow: { flex: 1, gap: 2 },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  warningBanner: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
