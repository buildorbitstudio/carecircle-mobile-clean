import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { AppButton, FormField, Screen, SectionHeader } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import { spacing } from '@/theme';
import { elderSchema, type ElderValues } from '@/validation/onboarding';

export default function ElderProfileScreen() {
  const { onboarding, updateOnboarding } = useAppStore();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ElderValues>({
    resolver: zodResolver(elderSchema),
    defaultValues: {
      elderFullName: onboarding.elderFullName,
      elderDateOfBirth: onboarding.elderDateOfBirth,
      primaryDoctor: onboarding.primaryDoctor,
      pharmacy: onboarding.pharmacy,
    },
  });

  const submit = (values: ElderValues) => {
    updateOnboarding({
      elderFullName: values.elderFullName.trim(),
      elderDateOfBirth: values.elderDateOfBirth.trim(),
      primaryDoctor: values.primaryDoctor?.trim() ?? '',
      pharmacy: values.pharmacy?.trim() ?? '',
    });
    router.push('/confirmation');
  };

  return (
    <Screen>
      <OnboardingHeader canGoBack step={3} />
      <SectionHeader
        description="Add the basics for the loved one your family will support."
        title="Create the elder profile"
      />
      <View style={{ gap: spacing.lg }}>
        <Controller
          control={control}
          name="elderFullName"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              autoFocus
              error={errors.elderFullName?.message}
              label="Full name"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Raj Menon"
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="elderDateOfBirth"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.elderDateOfBirth?.message}
              keyboardType="numbers-and-punctuation"
              label="Date of birth (optional)"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="YYYY-MM-DD"
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="primaryDoctor"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.primaryDoctor?.message}
              label="Primary doctor (optional)"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Dr. Patel"
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="pharmacy"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.pharmacy?.message}
              label="Pharmacy (optional)"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Main Street Pharmacy"
              value={value}
            />
          )}
        />
      </View>
      <AppButton label="Review details" onPress={handleSubmit(submit)} />
    </Screen>
  );
}
