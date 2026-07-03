import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, FeatureRow, Screen, SectionHeader } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

const pingTypes = [
  { icon: 'medical' as const, label: 'Medication', color: colors.primarySoft },
  { icon: 'happy' as const, label: 'Wellness', color: colors.successSoft },
  { icon: 'water' as const, label: 'Hydration', color: '#E0EFF7' },
  { icon: 'restaurant' as const, label: 'Meal', color: colors.accentSoft },
];

export default function CarePingsScreen() {
  return (
    <Screen>
      <SectionHeader
        description="Send Raj a simple question he can answer with one tap."
        title="Care Pings"
      />
      <View style={styles.grid}>
        {pingTypes.map((ping) => (
          <AppCard key={ping.label} style={styles.pingType}>
            <View style={[styles.pingIcon, { backgroundColor: ping.color }]}>
              <Ionicons color={colors.primaryDark} name={ping.icon} size={25} />
            </View>
            <AppText variant="bodyStrong">{ping.label}</AppText>
          </AppCard>
        ))}
      </View>
      <AppButton label="Create custom ping" variant="secondary" />
      <View style={styles.section}>
        <AppText variant="h2">Recent activity</AppText>
        <AppCard>
          <FeatureRow
            description="Responded “Good” • 12 min ago"
            icon="checkmark-circle"
            title="Wellness check"
          />
          <View style={styles.divider} />
          <FeatureRow
            description="Responded “Taken” • Yesterday"
            icon="medical"
            title="Evening medication"
          />
        </AppCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  pingType: { alignItems: 'center', gap: spacing.sm, width: '47%' },
  pingIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  section: { gap: spacing.md },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
});
