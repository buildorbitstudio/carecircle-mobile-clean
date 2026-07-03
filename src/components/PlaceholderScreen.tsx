import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppCard, AppText, Screen, SectionHeader } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

type PlaceholderScreenProps = {
  title: string;
  description: string;
  icon: IconName;
  nextStep: string;
};

export function PlaceholderScreen({
  title,
  description,
  icon,
  nextStep,
}: PlaceholderScreenProps) {
  return (
    <Screen>
      <SectionHeader description={description} title={title} />
      <AppCard style={styles.card}>
        <View style={styles.icon}>
          <Ionicons color={colors.primary} name={icon} size={32} />
        </View>
        <AppText align="center" variant="h3">
          Foundation ready
        </AppText>
        <AppText align="center" color="inkMuted">
          {nextStep}
        </AppText>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
});
