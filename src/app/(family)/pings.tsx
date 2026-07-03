import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  EmptyState,
  FormField,
  Screen,
  SectionHeader,
} from '@/components/ui';
import {
  pingTypeConfig,
  pingTypes,
  PingType,
} from '@/features/pings/ping-config';
import { CarePing, useCarePings } from '@/features/pings/useCarePings';
import { colors, radius, spacing } from '@/theme';

export default function CarePingsScreen() {
  const {
    context,
    pings,
    isLoading,
    isRefreshing,
    error,
    refresh,
    retry,
    sendPing,
  } = useCarePings();
  const [selectedType, setSelectedType] = useState<PingType>('wellness');
  const [selectedMessage, setSelectedMessage] = useState(
    pingTypeConfig.wellness.presets[0],
  );
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const message = selectedType === 'custom' ? customMessage : selectedMessage;
  const presets = useMemo(() => pingTypeConfig[selectedType].presets, [selectedType]);

  const chooseType = (type: PingType) => {
    setSelectedType(type);
    setSelectedMessage(pingTypeConfig[type].presets[0] ?? '');
    setCustomMessage('');
    setSendError(null);
    setSentMessage(null);
  };

  const submit = async () => {
    if (!message.trim()) {
      setSendError('Choose a message or write a custom Care Ping.');
      return;
    }

    setIsSending(true);
    setSendError(null);
    setSentMessage(null);

    try {
      await sendPing(selectedType, message);
      setSentMessage(`Care Ping sent to ${context?.elderName ?? 'your loved one'}.`);
      if (selectedType === 'custom') setCustomMessage('');
    } catch (caughtError) {
      setSendError(
        caughtError instanceof Error ? caughtError.message : 'Unable to send the Care Ping.',
      );
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading && !context) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText color="inkMuted">Loading Care Pings…</AppText>
      </Screen>
    );
  }

  if (error && !context) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <Ionicons color={colors.danger} name="cloud-offline" size={36} />
        <AppText align="center" variant="h2">
          Care Pings are unavailable
        </AppText>
        <AppText align="center" color="inkMuted">
          {error}
        </AppText>
        <AppButton label="Try again" onPress={() => void retry()} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => void refresh()} refreshing={isRefreshing}>
      <SectionHeader
        description={`Send ${context?.elderName ?? 'your loved one'} a simple question they can answer with one tap.`}
        title="Care Pings"
      />

      <View style={styles.section}>
        <AppText variant="h3">1. Choose a ping type</AppText>
        <View style={styles.typeGrid}>
          {pingTypes.map((type) => {
            const config = pingTypeConfig[type];
            const selected = type === selectedType;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={type}
                onPress={() => chooseType(type)}
                style={({ pressed }) => [
                  styles.typeCard,
                  selected && styles.typeCardSelected,
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.typeIcon, selected && styles.typeIconSelected]}>
                  <Ionicons
                    color={selected ? colors.white : colors.primary}
                    name={config.icon}
                    size={23}
                  />
                </View>
                <AppText
                  align="center"
                  color={selected ? 'primaryDark' : 'inkMuted'}
                  variant="caption">
                  {config.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="h3">2. Choose a message</AppText>
        {selectedType === 'custom' ? (
          <FormField
            label="Custom message"
            maxLength={500}
            multiline
            onChangeText={setCustomMessage}
            placeholder="What would you like to ask?"
            style={styles.messageInput}
            textAlignVertical="top"
            value={customMessage}
          />
        ) : (
          <View style={styles.presets}>
            {presets.map((preset) => {
              const selected = selectedMessage === preset;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={preset}
                  onPress={() => setSelectedMessage(preset)}
                  style={({ pressed }) => [
                    styles.preset,
                    selected && styles.presetSelected,
                    pressed && styles.pressed,
                  ]}>
                  <Ionicons
                    color={selected ? colors.primary : colors.inkMuted}
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={21}
                  />
                  <AppText style={styles.grow}>{preset}</AppText>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {sendError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Ionicons color={colors.danger} name="alert-circle" size={20} />
          <AppText color="danger" style={styles.grow} variant="caption">
            {sendError}
          </AppText>
        </View>
      ) : null}
      {sentMessage ? (
        <View accessibilityRole="alert" style={styles.successBanner}>
          <Ionicons color={colors.success} name="checkmark-circle" size={20} />
          <AppText color="success" style={styles.grow} variant="caption">
            {sentMessage}
          </AppText>
        </View>
      ) : null}

      <AppButton
        disabled={!message.trim()}
        label={`Send ${pingTypeConfig[selectedType].label} Ping`}
        loading={isSending}
        onPress={() => void submit()}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/elder')}
        style={({ pressed }) => [styles.elderModeButton, pressed && styles.pressed]}>
        <Ionicons color={colors.primary} name="phone-portrait" size={21} />
        <View style={styles.grow}>
          <AppText color="primary" variant="bodyStrong">
            Open Elder Mode
          </AppText>
          <AppText color="inkMuted" variant="caption">
            Preview the simple response screen on this device
          </AppText>
        </View>
        <Ionicons color={colors.primary} name="chevron-forward" size={20} />
      </Pressable>

      <View style={styles.section}>
        <AppText variant="h2">Ping activity</AppText>
        <AppCard>
          {pings.length ? (
            pings.map((ping, index) => (
              <View key={ping.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <PingActivityRow ping={ping} />
              </View>
            ))
          ) : (
            <EmptyState
              description="The first ping you send will appear here."
              icon="notifications-outline"
              title="No Care Pings yet"
            />
          )}
        </AppCard>
      </View>
    </Screen>
  );
}

function PingActivityRow({ ping }: { ping: CarePing }) {
  const config = pingTypeConfig[ping.ping_type];
  const status = displayStatus(ping);
  const urgent = status.tone === 'danger';

  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIcon, urgent && styles.activityIconUrgent]}>
        <Ionicons
          color={urgent ? colors.danger : colors.primary}
          name={config.icon}
          size={21}
        />
      </View>
      <View style={styles.grow}>
        <AppText numberOfLines={1} variant="bodyStrong">
          {ping.message}
        </AppText>
        <AppText color="inkMuted" variant="caption">
          {ping.response ? `${ping.response} • ` : ''}
          {formatRelative(ping.responded_at ?? ping.created_at)}
        </AppText>
      </View>
      <View style={[styles.statusPill, { backgroundColor: status.background }]}>
        <AppText style={{ color: status.color }} variant="caption">
          {status.label}
        </AppText>
      </View>
    </View>
  );
}

function displayStatus(ping: CarePing) {
  if (ping.urgency === 'urgent') {
    return {
      label: 'Urgent',
      tone: 'danger' as const,
      background: colors.dangerSoft,
      color: colors.danger,
    };
  }
  if (ping.urgency === 'warning' && ping.status === 'responded') {
    return {
      label: 'Attention',
      tone: 'warning' as const,
      background: colors.warningSoft,
      color: colors.warning,
    };
  }
  if (ping.status === 'unanswered') {
    return {
      label: 'Unanswered',
      tone: 'warning' as const,
      background: colors.warningSoft,
      color: colors.warning,
    };
  }
  if (ping.status === 'responded') {
    return {
      label: 'Responded',
      tone: 'success' as const,
      background: colors.successSoft,
      color: colors.success,
    };
  }
  return {
    label: 'Sent',
    tone: 'neutral' as const,
    background: colors.primarySoft,
    color: colors.primary,
  };
}

function formatRelative(value: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000),
  );
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  section: { gap: spacing.md },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  typeCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    width: '30.5%',
  },
  typeCardSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  typeIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  typeIconSelected: { backgroundColor: colors.primary },
  presets: { gap: spacing.md },
  preset: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 58,
    padding: spacing.md,
  },
  presetSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  messageInput: { minHeight: 120, paddingTop: spacing.md },
  grow: { flex: 1 },
  pressed: { opacity: 0.7 },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  successBanner: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  elderModeButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  activityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 58,
  },
  activityIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  activityIconUrgent: { backgroundColor: colors.dangerSoft },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
});
