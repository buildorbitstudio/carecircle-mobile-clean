import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { AppButton, AppCard, AppText, Screen, SectionHeader } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store/app-store';
import { colors, radius, spacing } from '@/theme';
import { elderSchema, familySchema, fullNameSchema } from '@/validation/onboarding';

type OnboardingResult = {
  family_id: string;
  elder_profile_id: string;
};

export default function ConfirmationScreen() {
  const { refreshOnboardingStatus } = useAuth();
  const { onboarding, resetOnboarding, setActiveElder, setRole } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const completeOnboarding = async () => {
    const fullNameResult = fullNameSchema.safeParse({ fullName: onboarding.fullName });
    const familyResult = familySchema.safeParse({ familyName: onboarding.familyName });
    const elderResult = elderSchema.safeParse({
      elderFullName: onboarding.elderFullName,
      elderDateOfBirth: onboarding.elderDateOfBirth,
      primaryDoctor: onboarding.primaryDoctor,
      pharmacy: onboarding.pharmacy,
    });

    if (!fullNameResult.success || !familyResult.success || !elderResult.success) {
      setErrorMessage('Some details are missing. Go back and complete each onboarding step.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { data, error } = await supabase.rpc('complete_onboarding', {
      p_full_name: fullNameResult.data.fullName,
      p_family_name: familyResult.data.familyName,
      p_elder_full_name: elderResult.data.elderFullName,
      p_elder_date_of_birth: elderResult.data.elderDateOfBirth || null,
      p_primary_doctor: elderResult.data.primaryDoctor || null,
      p_pharmacy: elderResult.data.pharmacy || null,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    const result = data as OnboardingResult;
    setActiveElder(result.elder_profile_id);
    setRole('admin');
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
        title="Ready to create your circle?"
      />
      <AppCard style={styles.summary}>
        <SummaryRow icon="person" label="Your name" value={onboarding.fullName} />
        <View style={styles.divider} />
        <SummaryRow icon="people" label="Family circle" value={onboarding.familyName} />
        <View style={styles.divider} />
        <SummaryRow icon="heart" label="Elder profile" value={onboarding.elderFullName} />
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
          Your family circle is private. Only approved members will be able to access its care
          information.
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
        label="Create family circle"
        loading={isSubmitting}
        onPress={() => void completeOnboarding()}
      />
    </Screen>
  );
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
