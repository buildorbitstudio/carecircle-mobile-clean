import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type SkeletonProps = {
  height?: number;
  width?: ViewStyle['width'];
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ height = 18, width = '100%', style }: SkeletonProps) {
  return <View accessibilityLabel="Loading" style={[styles.block, { height, width }, style]} />;
}

export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton height={24} width="54%" />
      <Skeleton width="86%" />
      <Skeleton width="68%" />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.border, borderRadius: radius.sm, opacity: 0.72 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.xl,
  },
});
