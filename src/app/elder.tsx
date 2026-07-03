import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton, AppText, FeedbackBanner, Screen, StateView } from '@/components/ui';
import {
  isPingType,
  pingTypeConfig,
  responsesForPing,
} from '@/features/pings/ping-config';
import { useCarePings } from '@/features/pings/useCarePings';
import { supabase } from '@/lib/supabase';
import {
  notifyCarePingResponse,
  notifyNeedHelp,
} from '@/lib/notifications/local-notifications';
import { colors, radius, spacing } from '@/theme';

const responsePalette = {
  success: { background: colors.successSoft, text: colors.success },
  warning: { background: colors.warningSoft, text: colors.warning },
  danger: { background: colors.dangerSoft, text: colors.danger },
  neutral: { background: colors.surfaceMuted, text: colors.ink },
};

export default function ElderModeScreen() {
  const { context, pings, isLoading, error, refresh, retry } = useCarePings();
  const [isResponding, setIsResponding] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const activePing = useMemo(
    () => pings.find((ping) => ping.status === 'sent') ?? null,
    [pings],
  );

  const respond = async (response: string) => {
    if (!activePing) return;

    setIsResponding(true);
    setResponseError(null);

    const { error: rpcError } = await supabase.rpc('respond_to_care_ping', {
      p_ping_id: activePing.id,
      p_response: response,
    });

    if (rpcError) {
      setResponseError(rpcError.message);
      setIsResponding(false);
      return;
    }

    setConfirmation(response);
    setIsResponding(false);
    if (response === 'Need Help') {
      await notifyNeedHelp({
        elderName: context?.elderName ?? 'Your loved one',
        response,
        pingId: activePing.id,
      });
    } else {
      await notifyCarePingResponse({
        elderName: context?.elderName ?? 'Your loved one',
        response,
        pingId: activePing.id,
      });
    }
    await refresh();
  };

  if (isLoading && !context) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <StateView count={2} state="loading" />
      </Screen>
    );
  }

  if (error && !context) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <Ionicons color={colors.danger} name="cloud-offline" size={48} />
        <AppText align="center" style={styles.largeHeading}>
          We couldn’t load your check-in.
        </AppText>
        <AppText align="center" color="inkMuted" style={styles.largeSupport}>
          {error}
        </AppText>
        <AppButton label="Try again" onPress={() => void retry()} size="lg" />
      </Screen>
    );
  }

  if (confirmation) {
    const urgent = confirmation === 'Need Help' || confirmation === 'Not Feeling Well';
    return (
      <Screen contentStyle={styles.confirmationScreen} scroll={false}>
        <View style={[styles.confirmIcon, urgent && styles.confirmIconUrgent]}>
          <AppText style={styles.confirmEmoji}>{urgent ? '❤️' : '✓'}</AppText>
        </View>
        <AppText align="center" style={styles.largeHeading}>
          {urgent ? 'Your family has been alerted.' : 'Thank you!'}
        </AppText>
        <AppText align="center" color="inkMuted" style={styles.largeSupport}>
          Your response “{confirmation}” was shared with your CareCircle.
        </AppText>
        <AppButton
          label="Done"
          size="lg"
          onPress={() => {
            setConfirmation(null);
            router.replace('/(family)');
          }}
        />
      </Screen>
    );
  }

  if (!activePing) {
    return (
      <Screen contentStyle={styles.confirmationScreen} scroll={false}>
        <View style={styles.brandMark}>
          <Ionicons color={colors.white} name="heart" size={34} />
        </View>
        <AppText align="center" style={styles.largeHeading}>
          You’re all caught up.
        </AppText>
        <AppText align="center" color="inkMuted" style={styles.largeSupport}>
          There are no new Care Pings right now.
        </AppText>
        <AppButton
          label="Return to family view"
          onPress={() => router.replace('/(family)')}
          size="lg"
        />
      </Screen>
    );
  }

  const pingType = isPingType(activePing.ping_type) ? activePing.ping_type : 'custom';
  const responses = responsesForPing(pingType);

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.brandMarkSmall}>
          <Ionicons color={colors.white} name="heart" size={22} />
        </View>
        <AppText style={styles.brandName}>CareCircle</AppText>
        <Pressable
          accessibilityLabel="Exit Elder Mode"
          accessibilityRole="button"
          accessibilityHint="Returns to the family dashboard"
          onPress={() => router.replace('/(family)')}
          style={styles.close}>
          <Ionicons color={colors.inkMuted} name="close" size={28} />
        </Pressable>
      </View>

      <View style={styles.message}>
        <View style={styles.typeBadge}>
          <Ionicons
            color={colors.primary}
            name={pingTypeConfig[pingType].icon}
            size={22}
          />
          <AppText color="primary" variant="bodyStrong">
            {pingTypeConfig[pingType].label} check-in
          </AppText>
        </View>
        <AppText align="center" color="inkMuted" style={styles.checkingIn}>
          Your family is checking in
        </AppText>
        <AppText
          accessibilityRole="header"
          align="center"
          style={styles.question}>
          {activePing.message}
        </AppText>
        <AppText align="center" color="inkMuted" style={styles.tapPrompt}>
          Tap one answer
        </AppText>
      </View>

      {responseError ? (
        <FeedbackBanner
          message="Please check the connection and tap your answer again."
          title={responseError}
          tone="error"
        />
      ) : null}

      <View style={styles.responses}>
        {responses.map((response) => {
          const palette = responsePalette[response.tone];
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Respond ${response.label}`}
              accessibilityHint="Sends this response to your family"
              accessibilityState={{ busy: isResponding, disabled: isResponding }}
              disabled={isResponding}
              key={response.label}
              onPress={() => void respond(response.label)}
              style={({ pressed }) => [
                styles.response,
                { backgroundColor: palette.background },
                pressed && styles.pressed,
                isResponding && styles.disabled,
              ]}>
              <AppText style={styles.emoji}>{response.emoji}</AppText>
              <AppText style={[styles.responseLabel, { color: palette.text }]}>
                {response.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between', paddingBottom: spacing.xl },
  centered: {
    alignItems: 'center',
    gap: spacing.xl,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  confirmationScreen: {
    alignItems: 'center',
    gap: spacing.xl,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  topBar: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  brandMarkSmall: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  brandName: { fontSize: 20, fontWeight: '700' },
  close: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    marginLeft: 'auto',
    width: 52,
  },
  message: { alignItems: 'center', gap: spacing.xl, paddingVertical: spacing.lg },
  typeBadge: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  checkingIn: { fontSize: 21, fontWeight: '500', lineHeight: 31 },
  question: {
    color: colors.ink,
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 50,
  },
  tapPrompt: { fontSize: 18, lineHeight: 26 },
  responses: { gap: spacing.lg },
  response: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.lg,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    minHeight: 92,
    paddingHorizontal: spacing.xl,
  },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.55 },
  emoji: { fontSize: 34, lineHeight: 42 },
  responseLabel: { flex: 1, fontSize: 24, fontWeight: '700', lineHeight: 32 },
  largeHeading: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 42,
  },
  largeSupport: { fontSize: 20, lineHeight: 29 },
  confirmIcon: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    height: 82,
    justifyContent: 'center',
    width: 82,
  },
  confirmIconUrgent: { backgroundColor: colors.dangerSoft },
  confirmEmoji: { color: colors.success, fontSize: 38, fontWeight: '700', lineHeight: 46 },
});
