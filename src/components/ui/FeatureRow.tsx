import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

type IconName = keyof typeof Ionicons.glyphMap;

type FeatureRowProps = {
  icon: IconName;
  title: string;
  description?: string;
  onPress?: () => void;
  tone?: 'default' | 'urgent';
};

export function FeatureRow({
  icon,
  title,
  description,
  onPress,
  tone = 'default',
}: FeatureRowProps) {
  const urgent = tone === 'urgent';

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.icon, urgent && styles.iconUrgent]}>
        <Ionicons color={urgent ? colors.danger : colors.primary} name={icon} size={22} />
      </View>
      <View style={styles.copy}>
        <AppText variant="bodyStrong">{title}</AppText>
        {description ? (
          <AppText color="inkMuted" variant="caption">
            {description}
          </AppText>
        ) : null}
      </View>
      {onPress ? <Ionicons color={colors.inkMuted} name="chevron-forward" size={20} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 60 },
  pressed: { opacity: 0.65 },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconUrgent: { backgroundColor: colors.dangerSoft },
  copy: { flex: 1, gap: 2 },
});
