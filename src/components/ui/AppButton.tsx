import { ActivityIndicator, Pressable, PressableProps, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type AppButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
};

const variantStyles = {
  primary: { backgroundColor: colors.primary, borderColor: colors.primary, text: colors.white },
  secondary: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
    text: colors.primaryDark,
  },
  ghost: { backgroundColor: 'transparent', borderColor: colors.border, text: colors.primaryDark },
  danger: { backgroundColor: colors.danger, borderColor: colors.danger, text: colors.white },
};

export function AppButton({
  label,
  variant = 'primary',
  loading,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const palette = variantStyles[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={(state) => [
        styles.button,
        { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor },
        state.pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <AppText variant="bodyStrong" style={{ color: palette.text }}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});
