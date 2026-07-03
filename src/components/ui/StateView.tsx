import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { CardSkeleton } from './Skeleton';

type StateViewProps =
  | { state: 'loading'; count?: number }
  | {
      state: 'empty' | 'error' | 'success';
      title: string;
      description: string;
      actionLabel?: string;
      onAction?: () => void;
      icon?: keyof typeof Ionicons.glyphMap;
    };

const defaults = {
  empty: { icon: 'heart-outline', color: colors.primary, background: colors.primarySoft },
  error: { icon: 'cloud-offline-outline', color: colors.danger, background: colors.dangerSoft },
  success: { icon: 'checkmark-circle-outline', color: colors.success, background: colors.successSoft },
} as const;

export function StateView(props: StateViewProps) {
  if (props.state === 'loading') {
    return (
      <View accessibilityLabel="Loading content" style={styles.loading}>
        {Array.from({ length: props.count ?? 3 }, (_, index) => (
          <CardSkeleton key={`skeleton-${index}`} />
        ))}
      </View>
    );
  }

  const visual = defaults[props.state];
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={props.state === 'error' ? 'alert' : undefined}
      style={styles.container}>
      <View style={[styles.icon, { backgroundColor: visual.background }]}>
        <Ionicons color={visual.color} name={props.icon ?? visual.icon} size={34} />
      </View>
      <AppText align="center" variant="h2">
        {props.title}
      </AppText>
      <AppText align="center" color="inkMuted">
        {props.description}
      </AppText>
      {props.actionLabel && props.onAction ? (
        <AppButton label={props.actionLabel} onPress={props.onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { gap: spacing.lg },
  container: {
    alignItems: 'center',
    gap: spacing.md,
    justifyContent: 'center',
    minHeight: 240,
    padding: spacing.xl,
  },
  icon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 68,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 68,
  },
});
