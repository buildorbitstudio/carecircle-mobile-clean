import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors, layout, radius, shadows, spacing } from '@/theme';
import { AppButton } from './AppButton';
import { AppText } from './AppText';

type ConfirmationModalProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string | null;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmationModal({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  loading = false,
  error,
  destructive = false,
  onCancel,
  onConfirm,
}: ConfirmationModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!loading) onCancel();
      }}
      statusBarTranslucent
      transparent
      visible={visible}>
      <View accessibilityViewIsModal style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close confirmation"
          accessibilityRole="button"
          disabled={loading}
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.dialog}>
          <View style={styles.copy}>
            <AppText variant="h2">{title}</AppText>
            <AppText color="inkMuted">{description}</AppText>
          </View>
          {error ? (
            <View accessibilityRole="alert" style={styles.error}>
              <AppText color="danger" variant="caption">{error}</AppText>
            </View>
          ) : null}
          <View style={styles.actions}>
            <AppButton
              disabled={loading}
              label={cancelLabel}
              onPress={onCancel}
              style={styles.action}
              variant="ghost"
            />
            <AppButton
              label={confirmLabel}
              loading={loading}
              onPress={onConfirm}
              style={styles.action}
              variant={destructive ? 'danger' : 'primary'}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'center',
    padding: layout.screenGutter,
  },
  dialog: {
    ...shadows.raised,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xl,
    maxWidth: 440,
    padding: spacing.xl,
    width: '100%',
  },
  copy: { gap: spacing.sm },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
});
