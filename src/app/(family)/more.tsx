import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppCard, FeatureRow, Screen, SectionHeader } from '@/components/ui';
import { colors } from '@/theme';

const sections = [
  { title: 'Health Timeline', icon: 'pulse' as const, href: '/timeline' as const },
  { title: 'Emergency Mode', icon: 'medical' as const, href: '/emergency' as const, urgent: true },
  { title: 'Documents', icon: 'document-text' as const, href: '/documents' as const },
  { title: 'Family Members', icon: 'people' as const, href: '/family-members' as const },
  { title: 'Settings', icon: 'settings' as const, href: '/settings' as const },
];

export default function MoreScreen() {
  return (
    <Screen>
      <SectionHeader description="Health records, family access, and preferences." title="More" />
      <AppCard>
        {sections.map((item, index) => (
          <View key={item.href}>
            <FeatureRow
              icon={item.icon}
              onPress={() => router.push(item.href)}
              title={item.title}
              tone={item.urgent ? 'urgent' : 'default'}
            />
            {index < sections.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
});
