import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppText, Screen } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export default function WelcomeScreen() {
  return (
    <Screen
      contentStyle={styles.screen}
      footer={
        <View style={styles.actions}>
          <AppButton label="Create your care circle" onPress={() => router.push('/signup')} />
          <AppButton label="I already have an account" onPress={() => router.push('/login')} variant="ghost" />
        </View>
      }>
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <Ionicons color={colors.white} name="heart" size={26} />
        </View>
        <AppText variant="h3">CareCircle</AppText>
      </View>
      <LinearGradient colors={[colors.primarySoft, colors.accentSoft]} style={styles.hero}>
        <View style={styles.people}>
          <View style={[styles.person, styles.personOne]} />
          <View style={[styles.person, styles.personTwo]} />
          <View style={[styles.person, styles.personThree]}>
            <Ionicons color={colors.primaryDark} name="heart" size={28} />
          </View>
        </View>
      </LinearGradient>
      <View style={styles.copy}>
        <AppText align="center" variant="display">
          Care feels lighter when it’s shared.
        </AppText>
        <AppText align="center" color="inkMuted">
          Coordinate medications, check-ins, appointments, and everyday support with the people
          your family trusts.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between' },
  brand: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  hero: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 250,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  people: { alignItems: 'flex-end', flexDirection: 'row' },
  person: { borderRadius: radius.pill, marginHorizontal: -8 },
  personOne: { backgroundColor: colors.accent, height: 108, width: 78 },
  personTwo: { backgroundColor: colors.primary, height: 142, width: 96, zIndex: 2 },
  personThree: {
    alignItems: 'center',
    backgroundColor: colors.white,
    height: 116,
    justifyContent: 'center',
    width: 82,
  },
  copy: { gap: spacing.md },
  actions: { gap: spacing.md },
});
