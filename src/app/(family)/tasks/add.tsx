import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton, AppText, FormField, Screen, SectionHeader } from '@/components/ui';
import { TaskPriority } from '@/features/tasks/types';
import { useCareTasks } from '@/features/tasks/useCareTasks';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/theme';
import { taskSchema, TaskFormValues } from '@/validation/task';

const priorities: TaskPriority[] = ['low', 'medium', 'high'];

function tomorrowKey() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function endOfLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 0, 0).toISOString();
}

export default function AddTaskScreen() {
  const { context, members, isLoading, error: contextError } = useCareTasks();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      assignedTo: '',
      dueDate: tomorrowKey(),
      priority: 'medium',
    },
  });

  const submit = async (values: TaskFormValues) => {
    if (!context) return;
    setSubmitError(null);

    const { data, error } = await supabase.rpc('create_care_task', {
      p_family_id: context.familyId,
      p_elder_profile_id: context.elderId,
      p_title: values.title.trim(),
      p_description: values.description?.trim() || null,
      p_assigned_to: values.assignedTo || null,
      p_due_date: endOfLocalDate(values.dueDate),
      p_priority: values.priority,
    });

    if (error) {
      setSubmitError(error.message);
      return;
    }

    const created = data as { id: string };
    router.replace({ pathname: '/tasks/[id]', params: { id: created.id } });
  };

  return (
    <Screen>
      <SectionHeader
        description={`Create a shared care task for ${context?.elderName ?? 'your loved one'}.`}
        title="New care task"
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
          name="title"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              autoFocus
              error={errors.title?.message}
              label="Task title"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Pick up prescription"
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.description?.message}
              label="Description"
              multiline
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Add instructions or useful details"
              style={styles.multiline}
              textAlignVertical="top"
              value={value}
            />
          )}
        />

        <Controller
          control={control}
          name="assignedTo"
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldGroup}>
              <AppText variant="caption">Assigned family member</AppText>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: value === '' }}
                onPress={() => onChange('')}
                style={[styles.memberCard, value === '' && styles.selectedCard]}>
                <View style={styles.memberAvatar}>
                  <AppText color="primary" variant="bodyStrong">
                    —
                  </AppText>
                </View>
                <View style={styles.grow}>
                  <AppText variant="bodyStrong">Unassigned</AppText>
                  <AppText color="inkMuted" variant="caption">
                    Anyone in the family can take this task.
                  </AppText>
                </View>
              </Pressable>
              {members.map((member) => {
                const selected = value === member.userId;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    key={member.userId}
                    onPress={() => onChange(member.userId)}
                    style={[styles.memberCard, selected && styles.selectedCard]}>
                    <View style={styles.memberAvatar}>
                      <AppText color="primary" variant="bodyStrong">
                        {initials(member.fullName)}
                      </AppText>
                    </View>
                    <View style={styles.grow}>
                      <AppText variant="bodyStrong">{member.fullName}</AppText>
                      <AppText color="inkMuted" variant="caption">
                        {capitalize(member.role)}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        />

        <Controller
          control={control}
          name="dueDate"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              error={errors.dueDate?.message}
              keyboardType="numbers-and-punctuation"
              label="Due date"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="YYYY-MM-DD"
              value={value}
            />
          )}
        />

        <Controller
          control={control}
          name="priority"
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldGroup}>
              <AppText variant="caption">Priority</AppText>
              <View style={styles.priorityRow}>
                {priorities.map((priority) => {
                  const selected = value === priority;
                  const tone =
                    priority === 'high'
                      ? colors.danger
                      : priority === 'medium'
                        ? colors.warning
                        : colors.primary;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      key={priority}
                      onPress={() => onChange(priority)}
                      style={[
                        styles.priorityChip,
                        selected && { backgroundColor: `${tone}18`, borderColor: tone },
                      ]}>
                      <AppText style={selected ? { color: tone } : undefined} variant="caption">
                        {capitalize(priority)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        />
      </View>

      {submitError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <AppText color="danger" variant="caption">
            {submitError}
          </AppText>
        </View>
      ) : null}

      <AppButton
        disabled={!context || isLoading}
        label="Create task"
        loading={isSubmitting}
        onPress={handleSubmit(submit)}
      />
    </Screen>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  multiline: { minHeight: 100, paddingTop: spacing.md },
  fieldGroup: { gap: spacing.sm },
  memberCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  selectedCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  memberAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  grow: { flex: 1, gap: 2 },
  priorityRow: { flexDirection: 'row', gap: spacing.sm },
  priorityChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
