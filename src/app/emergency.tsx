import { StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, FeatureRow, Screen, SectionHeader } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function EmergencyScreen() {
  return (
    <Screen>
      <View style={styles.warning}>
        <AppText align="center" color="danger" variant="bodyStrong">
          For a life-threatening emergency, call local emergency services now.
        </AppText>
      </View>
      <SectionHeader
        description="Essential information for Raj Menon."
        title="Emergency Information"
      />
      <AppButton label="Call emergency services" variant="danger" />
      <AppCard>
        <FeatureRow description="Type 2 diabetes, hypertension" icon="fitness" title="Conditions" />
        <View style={styles.divider} />
        <FeatureRow description="Penicillin • Severe" icon="warning" title="Allergies" tone="urgent" />
        <View style={styles.divider} />
        <FeatureRow description="2 active medications" icon="medical" title="Current medications" />
      </AppCard>
      <AppCard>
        <FeatureRow
          description="Primary emergency contact"
          icon="call"
          title="Harsh Menon • (604) 555-0142"
        />
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  warning: { backgroundColor: colors.dangerSoft, padding: spacing.md },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
});
