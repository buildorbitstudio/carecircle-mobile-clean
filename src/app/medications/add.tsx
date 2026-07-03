import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppButton, AppText, FormField, Screen, SectionHeader } from '@/components/ui';
import { useMedications } from '@/features/medications/useMedications';
import { supabase } from '@/lib/supabase';
import { scheduleMedicationReminders } from '@/lib/notifications/local-notifications';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';
import {
  medicationSchema,
  MedicationFormValues,
  parseScheduledTimes,
} from '@/validation/medication';

const frequencies = ['Once daily', 'Twice daily', 'Three times daily', 'As needed'];

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AddMedicationScreen() {
  const { session } = useAuth();
  const { context, isLoading, error: contextError } = useMedications();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      name: '',
      dosage: '',
      instructions: '',
      frequency: 'Once daily',
      scheduledTimes: '09:00',
      startDate: todayKey(),
      endDate: '',
      refillDate: '',
      active: true,
    },
  });

  const submit = async (values: MedicationFormValues) => {
    if (!context || !session?.user.id) return;

    setSubmitError(null);
    try {
      const { data, error } = await supabase
        .from('medications')
        .insert({
          elder_profile_id: context.elderId,
          name: values.name.trim(),
          dosage: values.dosage.trim(),
          instructions: values.instructions?.trim() || null,
          frequency: values.frequency.trim(),
          scheduled_times: parseScheduledTimes(values.scheduledTimes),
          start_date: values.startDate,
          end_date: values.endDate || null,
          refill_date: values.refillDate || null,
          active: values.active,
          created_by: session.user.id,
        })
        .select('id')
        .single();

      if (error) throw error;
      void scheduleMedicationReminders({
        medicationId: data.id,
        medicationName: values.name.trim(),
        dosage: values.dosage.trim(),
        scheduledTimes: parseScheduledTimes(values.scheduledTimes),
      }).catch((notificationError: unknown) => {
        console.warn(
          'Unable to schedule medication reminders:',
          notificationError instanceof Error
            ? notificationError.message
            : notificationError,
        );
      });
      router.replace({ pathname: '/medications/[id]', params: { id: data.id } });
    } catch (caughtError) {
      setSubmitError(
        caughtError instanceof Error ? caughtError.message : 'Unable to save medication.',
      );
    }
  };

  return (
    <Screen>
      <SectionHeader
        description={`Add medication details and a schedule for ${context?.elderName ?? 'your loved one'}.`}
        title="New medication"
      />

      {contextError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <AppText color="danger" variant="caption">
            {contextError}
          </AppText>
        </View>
      ) : null}

      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              autoFocus
              error={errors.name?.message}
              label="Medication name"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Metformin"
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="dosage"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.dosage?.message}
              label="Dosage"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="500mg"
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="instructions"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.instructions?.message}
              label="Instructions"
              multiline
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Take with food"
              style={styles.multiline}
              textAlignVertical="top"
              value={value}
            />
          )}
        />

        <Controller
          control={control}
          name="frequency"
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldGroup}>
              <AppText variant="caption">Frequency</AppText>
              <View style={styles.chips}>
                {frequencies.map((frequency) => {
                  const selected = value === frequency;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      key={frequency}
                      onPress={() => onChange(frequency)}
                      style={[styles.chip, selected && styles.chipSelected]}>
                      <AppText color={selected ? 'primaryDark' : 'inkMuted'} variant="caption">
                        {frequency}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
              {errors.frequency ? (
                <AppText color="danger" variant="caption">
                  {errors.frequency.message}
                </AppText>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="scheduledTimes"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.scheduledTimes?.message}
              label="Scheduled times"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="09:00, 18:00"
              value={value}
            />
          )}
        />
        <AppText color="inkMuted" variant="caption">
          Use 24-hour times separated by commas.
        </AppText>

        <Controller
          control={control}
          name="startDate"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.startDate?.message}
              keyboardType="numbers-and-punctuation"
              label="Start date"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="YYYY-MM-DD"
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="endDate"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.endDate?.message}
              keyboardType="numbers-and-punctuation"
              label="End date (optional)"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="YYYY-MM-DD"
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="refillDate"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.refillDate?.message}
              keyboardType="numbers-and-punctuation"
              label="Refill date (optional)"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="YYYY-MM-DD"
              value={value}
            />
          )}
        />

        <Controller
          control={control}
          name="active"
          render={({ field: { onChange, value } }) => (
            <View style={styles.switchRow}>
              <View style={styles.grow}>
                <AppText variant="bodyStrong">Active medication</AppText>
                <AppText color="inkMuted" variant="caption">
                  Include this medication in today’s schedule.
                </AppText>
              </View>
              <Switch
                onValueChange={onChange}
                thumbColor={colors.white}
                trackColor={{ false: colors.border, true: colors.primary }}
                value={value}
              />
            </View>
          )}
        />
      </View>

      <AppButton
        disabled={!context || isLoading}
        label="Save medication"
        loading={isSubmitting}
        onPress={handleSubmit(submit)}
      />
      {submitError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <AppText color="danger" variant="caption">
            {submitError}
          </AppText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  fieldGroup: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  multiline: { minHeight: 96, paddingTop: spacing.md },
  switchRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  grow: { flex: 1, gap: 2 },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
