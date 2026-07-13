import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet } from 'react-native';

import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { AppButton, AppText, FormField, Screen, SectionHeader } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store/app-store';
import { colors, spacing } from '@/theme';
import {
  fullNameSchema,
  type FullNameValues,
} from '@/validation/onboarding';

export default function FullNameScreen() {
  const { session, signOut } = useAuth();
  const { onboarding, updateOnboarding } = useAppStore();
  const suggestedName =
    onboarding.fullName || String(session?.user.user_metadata.full_name ?? '');
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FullNameValues>({
    resolver: zodResolver(fullNameSchema),
    defaultValues: { fullName: suggestedName },
  });

  useEffect(() => {
    if (!onboarding.fullName && suggestedName) {
      setValue('fullName', suggestedName);
    }
  }, [onboarding.fullName, setValue, suggestedName]);

  const submit = ({ fullName }: FullNameValues) => {
    updateOnboarding({ fullName: fullName.trim() });
    router.push('/account-type');
  };

  return (
    <Screen>
      <OnboardingHeader step={1} />
      <SectionHeader
        description="This is how your family will see you inside CareCircle."
        title="What’s your full name?"
      />
      <Controller
        control={control}
        name="fullName"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField
            autoComplete="name"
            autoFocus
            error={errors.fullName?.message}
            label="Full name"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Harsh Menon"
            returnKeyType="done"
            value={value}
          />
        )}
      />
      <AppButton label="Continue" onPress={handleSubmit(submit)} />
      <Pressable accessibilityRole="button" onPress={() => void signOut()}>
        <AppText align="center" color="inkMuted" style={styles.signOut} variant="caption">
          Sign out
        </AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  signOut: { color: colors.inkMuted, padding: spacing.md },
});
