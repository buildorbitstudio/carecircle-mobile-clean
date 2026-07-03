import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

type FeedbackTone = 'error' | 'success' | 'warning' | 'info';

const palettes = {
  error: { background: colors.dangerSoft, color: colors.danger, icon: 'alert-circle' },
  success: { background: colors.successSoft, color: colors.success, icon: 'checkmark-circle' },
  warning: { background: colors.warningSoft, color: colors.warning, icon: 'warning' },
  info: { background: colors.primarySoft, color: colors.primaryDark, icon: 'information-circle' },
} as const;

type FeedbackBannerProps = { message: string; title?: string; tone?: FeedbackTone };

export function FeedbackBanner({ message, title, tone = 'info' }: FeedbackBannerProps) {
  const palette = palettes[tone];
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={[styles.banner, { backgroundColor: palette.background }]}>
      <Ionicons color={palette.color} name={palette.icon} size={24} />
      <View style={styles.copy}>
        {title ? (
          <AppText style={{ color: palette.color }} variant="bodyStrong">
            {title}
          </AppText>
        ) : null}
        <AppText style={{ color: palette.color }} variant="caption">
          {message}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'flex-start',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  copy: { flex: 1, gap: spacing.xs },
});
