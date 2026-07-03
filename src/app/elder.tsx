import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Screen } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

const responses = [
  { emoji: '👍', label: 'Taken', background: colors.successSoft, color: colors.success },
  { emoji: '⏰', label: 'Remind me later', background: colors.warningSoft, color: colors.warning },
  { emoji: '❓', label: 'I need help', background: colors.dangerSoft, color: colors.danger },
];

export default function ElderModeScreen() {
  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Ionicons color={colors.white} name="heart" size={22} />
        </View>
        <AppText variant="h3">CareCircle</AppText>
        <Pressable
          accessibilityLabel="Exit Elder Mode"
          onPress={() => router.replace('/(family)')}
          style={styles.close}>
          <Ionicons color={colors.inkMuted} name="close" size={24} />
        </Pressable>
      </View>
      <View style={styles.message}>
        <AppText align="center" color="inkMuted" variant="h3">
          Harsh is checking in
        </AppText>
        <AppText align="center" style={styles.question}>
          Did you take your Metformin 500mg?
        </AppText>
        <AppText align="center" color="inkMuted">
          Tap one answer below
        </AppText>
      </View>
      <View style={styles.responses}>
        {responses.map((response) => (
          <Pressable
            accessibilityRole="button"
            key={response.label}
            style={({ pressed }) => [
              styles.response,
              { backgroundColor: response.background },
              pressed && styles.pressed,
            ]}>
            <AppText style={styles.emoji}>{response.emoji}</AppText>
            <AppText style={[styles.responseLabel, { color: response.color }]}>
              {response.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between', paddingBottom: spacing.xl },
  topBar: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  brand: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  close: { marginLeft: 'auto', padding: spacing.sm },
  message: { gap: spacing.lg },
  question: { color: colors.ink, fontSize: 34, fontWeight: '700', lineHeight: 42 },
  responses: { gap: spacing.md },
  response: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.lg,
    minHeight: 82,
    paddingHorizontal: spacing.xl,
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  emoji: { fontSize: 32, lineHeight: 38 },
  responseLabel: { fontSize: 22, fontWeight: '700' },
});
