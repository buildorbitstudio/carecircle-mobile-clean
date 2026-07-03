import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppCard, AppText, FeatureRow, Screen, SectionHeader } from '@/components/ui';
import { colors } from '@/theme';

export default function ScheduleScreen() {
  return (
    <Screen>
      <SectionHeader
        description="Medications and appointments in one calm daily view."
        title="Schedule"
      />
      <AppCard>
        <FeatureRow
          description="Metformin 500mg • Twice daily"
          icon="medical"
          onPress={() => router.push('/medications')}
          title="Medications"
        />
        <View style={styles.divider} />
        <FeatureRow
          description="Cardiologist • Friday at 10:00 AM"
          icon="calendar"
          onPress={() => router.push('/appointments')}
          title="Appointments"
        />
      </AppCard>
      <AppText variant="h2">Today</AppText>
      <AppCard>
        <FeatureRow description="Completed" icon="checkmark-circle" title="9:00 AM medication" />
        <View style={styles.divider} />
        <FeatureRow description="Upcoming" icon="time" title="6:00 PM medication" />
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
});
