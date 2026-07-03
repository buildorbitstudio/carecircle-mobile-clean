import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';

import { AppButton, AppText, FormField, Screen, SectionHeader } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';
import { signupSchema, SignupValues } from '@/validation/auth';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const submit = async ({ email, fullName, password }: SignupValues) => {
    setAuthError(null);

    try {
      const { requiresEmailConfirmation } = await signUp({ email, fullName, password });

      if (requiresEmailConfirmation) {
        Alert.alert(
          'Check your email',
          'We sent you a confirmation link. Confirm your email, then return to CareCircle and sign in.',
          [{ text: 'Go to sign in', onPress: () => router.replace('/login') }],
        );
      }
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Unable to create your account. Please try again.',
      );
    }
  };

  return (
    <Screen>
      <AppText color="primary" variant="h3">
        CareCircle
      </AppText>
      <SectionHeader
        description="Start a private space for your family’s care."
        title="Create your account"
      />
      <View style={styles.form}>
        <Controller
          control={control}
          name="fullName"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              autoComplete="name"
              error={errors.fullName?.message}
              label="Full name"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email?.message}
              keyboardType="email-address"
              label="Email address"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              autoComplete="new-password"
              error={errors.password?.message}
              label="Password"
              onBlur={onBlur}
              onChangeText={onChange}
              secureTextEntry
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              label="Confirm password"
              onBlur={onBlur}
              onChangeText={onChange}
              secureTextEntry
              value={value}
            />
          )}
        />
        {authError ? (
          <View accessibilityRole="alert" style={styles.error}>
            <AppText color="danger" variant="caption">
              {authError}
            </AppText>
          </View>
        ) : null}
        <AppButton
          label="Create account"
          loading={isSubmitting}
          onPress={handleSubmit(submit)}
        />
      </View>
      <AppText align="center" color="inkMuted">
        Already have an account?{' '}
        <Link href="/login" style={styles.link}>
          Sign in
        </Link>
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  link: { color: colors.primary, fontWeight: '700' },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    padding: spacing.md,
  },
});
