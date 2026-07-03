import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

type OnboardingHeaderProps = {
  step: number;
  canGoBack?: boolean;
};

export function OnboardingHeader({ step, canGoBack = false }: OnboardingHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.top}>
        {canGoBack ? (
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.back}>
            <Ionicons color={colors.primaryDark} name="chevron-back" size={24} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <AppText color="inkMuted" variant="caption">
          Step {step} of 4
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${step * 25}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  back: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  track: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 7,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: '100%',
  },
});
