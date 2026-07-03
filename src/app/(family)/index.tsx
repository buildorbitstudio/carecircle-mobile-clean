import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, FeatureRow, Screen } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export default function DashboardScreen() {
  return (
    <Screen>
      <View style={styles.topBar}>
        <View>
          <AppText color="inkMuted" variant="caption">
            Good morning, Harsh
          </AppText>
          <AppText variant="h1">Raj’s care today</AppText>
        </View>
        <Pressable
          accessibilityLabel="Open settings"
          onPress={() => router.push('/settings')}
          style={styles.avatar}>
          <AppText color="white" variant="bodyStrong">
            H
          </AppText>
        </Pressable>
      </View>

      <AppCard style={styles.elderCard}>
        <View style={styles.elderAvatar}>
          <Ionicons color={colors.primary} name="person" size={30} />
        </View>
        <View style={styles.grow}>
          <AppText variant="h3">Raj Menon</AppText>
          <AppText color="success" variant="caption">
            ● Checked in 12 min ago
          </AppText>
        </View>
        <Ionicons color={colors.inkMuted} name="chevron-down" size={20} />
      </AppCard>

      <AppButton
        label="Send a Care Ping"
        onPress={() => router.push('/(family)/pings')}
        variant="primary"
      />

      <View style={styles.stats}>
        <AppCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.successSoft }]}>
            <Ionicons color={colors.success} name="medical" size={21} />
          </View>
          <AppText color="inkMuted" variant="caption">
            Medication
          </AppText>
          <AppText variant="h3">Next at 6 PM</AppText>
        </AppCard>
        <AppCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons color={colors.warning} name="calendar" size={21} />
          </View>
          <AppText color="inkMuted" variant="caption">
            Appointment
          </AppText>
          <AppText variant="h3">Friday, 10 AM</AppText>
        </AppCard>
      </View>

      <View style={styles.section}>
        <AppText variant="h2">Today</AppText>
        <AppCard>
          <FeatureRow
            description="Metformin 500mg • 9:00 AM"
            icon="checkmark-circle"
            title="Morning medication taken"
          />
          <View style={styles.divider} />
          <FeatureRow
            description="Assigned to Deepak • Due today"
            icon="bag-handle"
            title="Pick up prescription"
          />
        </AppCard>
      </View>

      <Pressable onPress={() => router.push('/emergency')}>
        <AppCard style={styles.emergencyCard}>
          <Ionicons color={colors.danger} name="medical" size={22} />
          <View style={styles.grow}>
            <AppText color="danger" variant="bodyStrong">
              Emergency information
            </AppText>
            <AppText color="inkMuted" variant="caption">
              Contacts, conditions, allergies, and medications
            </AppText>
          </View>
          <Ionicons color={colors.danger} name="chevron-forward" size={20} />
        </AppCard>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  elderCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  elderAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  grow: { flex: 1, gap: 2 },
  stats: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, gap: spacing.sm },
  statIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  section: { gap: spacing.md },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
  emergencyCard: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: '#F0C5C1',
    flexDirection: 'row',
    gap: spacing.md,
  },
});
