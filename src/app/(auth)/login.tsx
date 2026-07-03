import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppText, FormField, Screen, SectionHeader } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';
import { loginSchema, LoginValues } from '@/validation/auth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = async ({ email, password }: LoginValues) => {
    setAuthError(null);

    try {
      await signIn(email, password);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    }
  };

  return (
    <Screen contentStyle={styles.screen}>
      <AppText color="primary" variant="h3">
        CareCircle
      </AppText>
      <SectionHeader description="Welcome back. Your family circle is waiting." title="Sign in" />
      <View style={styles.form}>
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
              autoComplete="password"
              error={errors.password?.message}
              label="Password"
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
        <AppButton label="Sign in" loading={isSubmitting} onPress={handleSubmit(submit)} />
      </View>
      <AppText align="center" color="inkMuted">
        New to CareCircle?{' '}
        <Link href="/signup" style={styles.link}>
          Create an account
        </Link>
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.xxl },
  form: { gap: spacing.lg },
  link: { color: colors.primary, fontWeight: '700' },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    padding: spacing.md,
  },
});
