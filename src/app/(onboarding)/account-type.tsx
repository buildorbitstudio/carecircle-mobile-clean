import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { AppButton, AppCard, AppText, Screen, SectionHeader } from '@/components/ui';
import { AccountMode, useAppStore } from '@/store/app-store';
import { colors, radius, spacing } from '@/theme';

const accountTypes: {
  value: AccountMode;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: 'individual',
    title: 'Individual care',
    description: 'Track your own medications, tasks, appointments, emergency details, and health timeline.',
    icon: 'person-circle',
  },
  {
    value: 'family',
    title: 'Family caregiving',
    description: 'Create a shared care circle for an elder and coordinate care with trusted family members.',
    icon: 'people',
  },
];

export default function AccountTypeScreen() {
  const { onboarding, updateOnboarding } = useAppStore();
  const selected = onboarding.accountType;

  const continueOnboarding = () => {
    if (selected === 'individual') {
      router.push('/personal-profile');
      return;
    }
    if (selected === 'family') {
      router.push('/family-circle');
    }
  };

  return (
    <Screen>
      <OnboardingHeader canGoBack step={2} />
      <SectionHeader
        description="You can always use CareCircle personally and with a family circle. This sets up your first experience."
        title="How will you use CareCircle first?"
      />
      <View style={styles.options}>
        {accountTypes.map((type) => {
          const isSelected = selected === type.value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              key={type.value}
              onPress={() => updateOnboarding({ accountType: type.value })}
              style={({ pressed }) => pressed && styles.pressed}>
              <AppCard style={[styles.option, isSelected && styles.selected]}>
                <View style={[styles.icon, isSelected && styles.selectedIcon]}>
                  <Ionicons
                    color={isSelected ? colors.white : colors.primary}
                    name={type.icon}
                    size={28}
                  />
                </View>
                <View style={styles.copy}>
                  <AppText variant="h3">{type.title}</AppText>
                  <AppText color="inkMuted">{type.description}</AppText>
                </View>
                {isSelected ? (
                  <Ionicons color={colors.primary} name="checkmark-circle" size={26} />
                ) : null}
              </AppCard>
            </Pressable>
          );
        })}
      </View>
      <AppButton disabled={!selected} label="Continue" onPress={continueOnboarding} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { gap: spacing.md },
  option: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  selectedIcon: { backgroundColor: colors.primary },
  copy: { flex: 1, gap: spacing.xs },
  pressed: { opacity: 0.72 },
});
