import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton, AppText, FormField, Screen, SectionHeader } from '@/components/ui';
import { FamilyAssignee, TaskPriority } from '@/features/tasks/types';
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
    const assignedTo = context.isAdmin ? values.assignedTo || null : null;

    const { data, error } = await supabase.rpc('create_care_task', {
      p_family_id: context.familyId,
      p_elder_profile_id: context.elderId,
      p_title: values.title.trim(),
      p_description: values.description?.trim() || null,
      p_assigned_to: assignedTo,
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
              <View style={styles.assignmentHeader}>
                <View style={styles.assignmentTitle}>
                  <Ionicons color={colors.primary} name="people" size={19} />
                  <AppText variant="caption">Assign to family member</AppText>
                </View>
                {context?.isAdmin ? (
                  <View style={styles.adminPill}>
                    <AppText color="primary" variant="caption">
                      Admin
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText color="inkMuted" variant="caption">
                {context?.isAdmin
                  ? 'Choose any active person in this family circle.'
                  : 'Only family admins can assign a task to a specific person. This task will be created as unassigned.'}
              </AppText>
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
              {groupAssignees(members).map((group) => (
                <View key={group.role} style={styles.assigneeGroup}>
                  <AppText color="inkMuted" variant="caption">
                    {group.label} ({group.members.length})
                  </AppText>
                  {group.members.map((member) => {
                    const selected = value === member.userId;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{
                          checked: selected,
                          disabled: !context?.isAdmin,
                        }}
                        disabled={!context?.isAdmin}
                        key={member.userId}
                        onPress={() => onChange(member.userId)}
                        style={[
                          styles.memberCard,
                          selected && styles.selectedCard,
                          !context?.isAdmin && styles.disabledCard,
                        ]}>
                        <View style={styles.memberAvatar}>
                          <AppText color="primary" variant="bodyStrong">
                            {initials(member.fullName)}
                          </AppText>
                        </View>
                        <View style={styles.grow}>
                          <AppText variant="bodyStrong">{member.fullName}</AppText>
                          <AppText color="inkMuted" variant="caption">
                            {member.email || capitalize(member.role)}
                          </AppText>
                        </View>
                        {selected ? (
                          <Ionicons color={colors.primary} name="checkmark-circle" size={24} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
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
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function groupAssignees(members: FamilyAssignee[]) {
  const order: FamilyAssignee['role'][] = ['admin', 'member', 'elder'];
  const labels: Record<FamilyAssignee['role'], string> = {
    admin: 'Admins',
    member: 'Family members',
    elder: 'Elders',
  };

  return order
    .map((role) => ({
      label: labels[role],
      members: members.filter((member) => member.role === role),
      role,
    }))
    .filter((group) => group.members.length > 0);
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  multiline: { minHeight: 100, paddingTop: spacing.md },
  fieldGroup: { gap: spacing.sm },
  assignmentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  assignmentTitle: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  adminPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  assigneeGroup: { gap: spacing.sm },
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
  disabledCard: { opacity: 0.58 },
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
