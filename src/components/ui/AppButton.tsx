import { ActivityIndicator, Pressable, PressableProps, StyleSheet } from 'react-native';

import { buttonSizes, colors, radius } from '@/theme';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = keyof typeof buttonSizes;

type AppButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
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
  size = 'md',
  loading,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const palette = variantStyles[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: Boolean(loading), disabled: Boolean(disabled || loading) }}
      disabled={disabled || loading}
      style={(state) => [
        styles.button,
        buttonSizes[size],
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});
