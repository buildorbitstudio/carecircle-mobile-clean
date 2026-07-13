import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { AppButton, AppCard, AppText, Screen, SectionHeader } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store/app-store';
import { colors, radius, spacing } from '@/theme';
import {
  elderSchema,
  ElderValues,
  familySchema,
  FamilyValues,
  fullNameSchema,
  personalProfileSchema,
  PersonalProfileValues,
} from '@/validation/onboarding';

type OnboardingResult = {
  family_id: string;
  elder_profile_id: string;
  role?: 'admin' | 'member' | 'elder';
};

export default function ConfirmationScreen() {
  const { refreshOnboardingStatus } = useAuth();
  const { onboarding, resetOnboarding, setActiveElder, setRole } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const completeOnboarding = async () => {
    const fullNameResult = fullNameSchema.safeParse({ fullName: onboarding.fullName });
    const isIndividual = onboarding.accountType === 'individual';
    const familyResult = familySchema.safeParse({ familyName: onboarding.familyName });
    const elderResult = elderSchema.safeParse({
      elderFullName: onboarding.elderFullName,
      elderDateOfBirth: onboarding.elderDateOfBirth,
      primaryDoctor: onboarding.primaryDoctor,
      pharmacy: onboarding.pharmacy,
    });

    const personalResult = personalProfileSchema.safeParse({
      address: onboarding.address,
      dateOfBirth: onboarding.elderDateOfBirth,
      emergencyContactName: onboarding.emergencyContactName,
      emergencyContactPhone: onboarding.emergencyContactPhone,
      emergencyContactRelationship: onboarding.emergencyContactRelationship,
      pharmacy: onboarding.pharmacy,
      phone: onboarding.phone,
      primaryDoctor: onboarding.primaryDoctor,
    });

    if (
      !fullNameResult.success ||
      (isIndividual ? !personalResult.success : (!familyResult.success || !elderResult.success))
    ) {
      setErrorMessage('Some details are missing. Go back and complete each onboarding step.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const onboardingResponse = isIndividual
      ? personalResult.success
        ? await completeIndividual(fullNameResult.data.fullName, personalResult.data)
        : { data: null, error: new Error('Personal profile is incomplete.') }
      : familyResult.success && elderResult.success
        ? await completeFamily(fullNameResult.data.fullName, familyResult.data, elderResult.data)
        : { data: null, error: new Error('Family profile is incomplete.') };
    const { data, error } = onboardingResponse;

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    const result = data as OnboardingResult;
    setActiveElder(result.elder_profile_id);
    setRole(result.role ?? 'admin');
    resetOnboarding();

    try {
      await refreshOnboardingStatus();
    } catch (refreshError) {
      setErrorMessage(
        refreshError instanceof Error
          ? refreshError.message
          : 'Your family was created, but the app could not refresh. Please restart CareCircle.',
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <OnboardingHeader canGoBack step={4} />
      <SectionHeader
        description="Make sure everything looks right before creating your private care space."
        title={onboarding.accountType === 'individual' ? 'Ready to create your profile?' : 'Ready to create your circle?'}
      />
      <AppCard style={styles.summary}>
        <SummaryRow icon="person" label="Your name" value={onboarding.fullName} />
        <View style={styles.divider} />
        <SummaryRow
          icon={onboarding.accountType === 'individual' ? 'person-circle' : 'people'}
          label="Account type"
          value={onboarding.accountType === 'individual' ? 'Individual care' : 'Family caregiving'}
        />
        <View style={styles.divider} />
        {onboarding.accountType === 'individual' ? (
          <SummaryRow icon="medical" label="Emergency profile" value="Personal emergency details" />
        ) : (
          <>
            <SummaryRow icon="people" label="Family circle" value={onboarding.familyName} />
            <View style={styles.divider} />
            <SummaryRow icon="heart" label="Elder profile" value={onboarding.elderFullName} />
          </>
        )}
        {onboarding.elderDateOfBirth ? (
          <>
            <View style={styles.divider} />
            <SummaryRow
              icon="calendar"
              label="Date of birth"
              value={onboarding.elderDateOfBirth}
            />
          </>
        ) : null}
      </AppCard>
      <View style={styles.notice}>
        <Ionicons color={colors.primary} name="shield-checkmark" size={22} />
        <AppText color="inkMuted" style={styles.noticeCopy} variant="caption">
          {onboarding.accountType === 'individual'
            ? 'Your individual profile is private to you unless you later invite family members.'
            : 'Your family circle is private. Only approved members will be able to access its care information.'}
        </AppText>
      </View>
      {errorMessage ? (
        <View accessibilityRole="alert" style={styles.error}>
          <AppText color="danger" variant="caption">
            {errorMessage}
          </AppText>
        </View>
      ) : null}
      <AppButton
        label={onboarding.accountType === 'individual' ? 'Create personal profile' : 'Create family circle'}
        loading={isSubmitting}
        onPress={() => void completeOnboarding()}
      />
    </Screen>
  );
}

function completeIndividual(fullName: string, values: PersonalProfileValues) {
  return supabase.rpc('complete_individual_onboarding', {
    p_address: values.address || '',
    p_date_of_birth: values.dateOfBirth || null,
    p_emergency_contact_name: values.emergencyContactName || '',
    p_emergency_contact_phone: values.emergencyContactPhone || '',
    p_emergency_contact_relationship: values.emergencyContactRelationship || '',
    p_full_name: fullName,
    p_pharmacy: values.pharmacy || '',
    p_phone: values.phone || '',
    p_primary_doctor: values.primaryDoctor || '',
  });
}

function completeFamily(fullName: string, family: FamilyValues, elder: ElderValues) {
  return supabase.rpc('complete_onboarding', {
    p_full_name: fullName,
    p_family_name: family.familyName,
    p_elder_full_name: elder.elderFullName,
    p_elder_date_of_birth: elder.elderDateOfBirth || null,
    p_primary_doctor: elder.primaryDoctor || null,
    p_pharmacy: elder.pharmacy || null,
  });
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Ionicons color={colors.primary} name={icon} size={20} />
      </View>
      <View style={styles.rowCopy}>
        <AppText color="inkMuted" variant="caption">
          {label}
        </AppText>
        <AppText variant="bodyStrong">{value || 'Not provided'}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: spacing.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  rowCopy: { flex: 1, gap: 2 },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  noticeCopy: { flex: 1 },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
