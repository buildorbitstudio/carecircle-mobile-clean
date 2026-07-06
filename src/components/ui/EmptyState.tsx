import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  actionLabel,
  description,
  icon,
  onAction,
  title,
}: EmptyStateProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.icon}>
        <Ionicons color={colors.inkMuted} name={icon} size={22} />
      </View>
      <View style={styles.copy}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText color="inkMuted" variant="caption">
          {description}
        </AppText>
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.action}>
          <AppText color="primary" variant="label">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  copy: { flex: 1, gap: 2 },
  action: { justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.sm },
});
