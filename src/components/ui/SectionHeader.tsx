import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import { AppText } from './AppText';

type SectionHeaderProps = { title: string; description?: string };

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <View style={styles.header}>
      <AppText variant="h1">{title}</AppText>
      {description ? <AppText color="inkMuted">{description}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({ header: { gap: spacing.sm } });
