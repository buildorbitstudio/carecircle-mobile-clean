import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { AppButton, FormField, Screen, SectionHeader } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import { spacing } from '@/theme';
import {
  personalProfileSchema,
  type PersonalProfileValues,
} from '@/validation/onboarding';

export default function PersonalProfileScreen() {
  const { onboarding, updateOnboarding } = useAppStore();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonalProfileValues>({
    resolver: zodResolver(personalProfileSchema),
    defaultValues: {
      address: onboarding.address,
      dateOfBirth: onboarding.elderDateOfBirth,
      emergencyContactName: onboarding.emergencyContactName,
      emergencyContactPhone: onboarding.emergencyContactPhone,
      emergencyContactRelationship: onboarding.emergencyContactRelationship,
      pharmacy: onboarding.pharmacy,
      phone: onboarding.phone,
      primaryDoctor: onboarding.primaryDoctor,
    },
  });

  const submit = (values: PersonalProfileValues) => {
    updateOnboarding({
      address: values.address?.trim() ?? '',
      elderFullName: onboarding.fullName,
      elderDateOfBirth: values.dateOfBirth.trim(),
      emergencyContactName: values.emergencyContactName?.trim() ?? '',
      emergencyContactPhone: values.emergencyContactPhone?.trim() ?? '',
      emergencyContactRelationship: values.emergencyContactRelationship?.trim() ?? '',
      pharmacy: values.pharmacy?.trim() ?? '',
      phone: values.phone?.trim() ?? '',
      primaryDoctor: values.primaryDoctor?.trim() ?? '',
    });
    router.push('/confirmation');
  };

  return (
    <Screen>
      <OnboardingHeader canGoBack step={3} />
      <SectionHeader
        description="These basics power your personal medications, tasks, emergency mode, and health timeline."
        title="Set up your personal profile"
      />
      <View style={{ gap: spacing.lg }}>
        <Controller
          control={control}
          name="dateOfBirth"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.dateOfBirth?.message}
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
          name="phone"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.phone?.message}
              keyboardType="phone-pad"
              label="Phone number"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="555-010-1234"
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="address"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.address?.message}
              label="Address"
              multiline
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Home address for emergency reference"
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
              label="Primary doctor"
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
              label="Pharmacy"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Main Street Pharmacy"
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="emergencyContactName"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.emergencyContactName?.message}
              label="Emergency contact name"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="A trusted contact"
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="emergencyContactRelationship"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.emergencyContactRelationship?.message}
              label="Emergency contact relationship"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Spouse, friend, sibling"
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="emergencyContactPhone"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.emergencyContactPhone?.message}
              keyboardType="phone-pad"
              label="Emergency contact phone"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="555-010-5678"
              value={value}
            />
          )}
        />
      </View>
      <AppButton label="Review details" onPress={handleSubmit(submit)} />
    </Screen>
  );
}
