import { router } from 'expo-router';
import { Component, ErrorInfo, PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, Screen } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  PropsWithChildren,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('CareCircle runtime error:', error, info.componentStack);
    }
  }

  private retry = () => {
    this.setState({ error: null });
  };

  private goToDashboard = () => {
    this.setState({ error: null }, () => {
      router.replace('/');
    });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Screen contentStyle={styles.screen} scroll={false}>
        <View style={styles.icon}>
          <AppText style={styles.heart}>♡</AppText>
        </View>
        <View style={styles.copy}>
          <AppText align="center" variant="h1">
            CareCircle needs a moment
          </AppText>
          <AppText align="center" color="inkMuted">
            Something unexpected happened. Your care information is safe, and you can try
            again or return to the Dashboard.
          </AppText>
        </View>
        {__DEV__ ? (
          <AppCard style={styles.details}>
            <AppText color="warning" variant="caption">
              Development details
            </AppText>
            <AppText selectable variant="caption">
              {error.message || 'Unknown runtime error'}
            </AppText>
          </AppCard>
        ) : null}
        <View style={styles.actions}>
          <AppButton label="Retry" onPress={this.retry} />
          <AppButton label="Go to Dashboard" onPress={this.goToDashboard} variant="secondary" />
        </View>
      </Screen>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  heart: {
    color: colors.primary,
    fontSize: 48,
    fontWeight: '600',
    lineHeight: 56,
  },
  copy: { gap: spacing.md, maxWidth: 480 },
  details: {
    backgroundColor: colors.warningSoft,
    gap: spacing.sm,
    maxWidth: 480,
    width: '100%',
  },
  actions: { gap: spacing.md, maxWidth: 480, width: '100%' },
});
