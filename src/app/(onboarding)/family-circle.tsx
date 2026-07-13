import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { AppButton, FormField, Screen, SectionHeader } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import { familySchema, type FamilyValues } from '@/validation/onboarding';

export default function FamilyCircleScreen() {
  const { onboarding, updateOnboarding } = useAppStore();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FamilyValues>({
    resolver: zodResolver(familySchema),
    defaultValues: { familyName: onboarding.familyName },
  });

  const submit = ({ familyName }: FamilyValues) => {
    updateOnboarding({ familyName: familyName.trim() });
    router.push('/care-recipient');
  };

  return (
    <Screen>
      <OnboardingHeader canGoBack step={2} />
      <SectionHeader
        description="Choose a familiar name for your private family space."
        title="Name your family circle"
      />
      <Controller
        control={control}
        name="familyName"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField
            autoFocus
            error={errors.familyName?.message}
            label="Family circle name"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Menon Family"
            returnKeyType="done"
            value={value}
          />
        )}
      />
      <AppButton label="Continue" onPress={handleSubmit(submit)} />
    </Screen>
  );
}
