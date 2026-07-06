import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, FormField } from '@/components/ui';
import { spacing } from '@/theme';
import { appointmentSchema, AppointmentFormValues } from '@/validation/appointment';

type AppointmentFormProps = {
  defaultValues: AppointmentFormValues;
  submitLabel: string;
  onSubmit: (values: AppointmentFormValues) => Promise<void>;
};

export function AppointmentForm({ defaultValues, onSubmit, submitLabel }: AppointmentFormProps) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<AppointmentFormValues>({ defaultValues, resolver: zodResolver(appointmentSchema) });

  return (
    <AppCard style={styles.form}>
      <Controller control={control} name="title" render={({ field }) => (
        <FormField autoFocus error={errors.title?.message} label="Appointment title"
          onBlur={field.onBlur} onChangeText={field.onChange} placeholder="Cardiology check-up" value={field.value} />
      )} />
      <Controller control={control} name="clinicName" render={({ field }) => (
        <FormField error={errors.clinicName?.message} label="Provider or clinic"
          onBlur={field.onBlur} onChangeText={field.onChange} placeholder="Family Health Clinic" value={field.value} />
      )} />
      <View style={styles.row}>
        <Controller control={control} name="date" render={({ field }) => (
          <FormField error={errors.date?.message} label="Date" onBlur={field.onBlur}
            onChangeText={field.onChange} placeholder="YYYY-MM-DD" value={field.value} />
        )} />
        <Controller control={control} name="time" render={({ field }) => (
          <FormField error={errors.time?.message} label="Time" onBlur={field.onBlur}
            onChangeText={field.onChange} placeholder="10:00" value={field.value} />
        )} />
      </View>
      <Controller control={control} name="location" render={({ field }) => (
        <FormField error={errors.location?.message} label="Location" onBlur={field.onBlur}
          onChangeText={field.onChange} placeholder="123 Main Street" value={field.value} />
      )} />
      <Controller control={control} name="notes" render={({ field }) => (
        <FormField error={errors.notes?.message} label="Notes" multiline onBlur={field.onBlur}
          onChangeText={field.onChange} placeholder="Bring medication list" value={field.value} />
      )} />
      <Controller control={control} name="reminderMinutes" render={({ field }) => (
        <View style={styles.field}>
          <AppText variant="caption">Reminder</AppText>
          <View style={styles.reminders}>
            {[0, 15, 30, 60, 1440].map((minutes) => (
              <AppButton key={minutes} label={minutes === 0 ? 'None' : minutes === 1440 ? '1 day' : `${minutes} min`}
                onPress={() => field.onChange(minutes)} size="sm"
                variant={field.value === minutes ? 'secondary' : 'ghost'} />
            ))}
          </View>
        </View>
      )} />
      <AppButton label={submitLabel} loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  field: { gap: spacing.sm },
  reminders: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
