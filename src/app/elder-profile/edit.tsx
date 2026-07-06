import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { AppButton, AppCard, FeedbackBanner, FormField, Screen, SectionHeader, StateView } from '@/components/ui';
import {
  ElderProfileData,
  useElderProfile,
} from '@/features/elder-profile/useElderProfile';
import { supabase } from '@/lib/supabase';
import { ElderProfileFormValues, elderProfileSchema } from '@/validation/elder-profile';

export default function EditElderProfileScreen() {
  const { data, error, isLoading, retry } = useElderProfile();
  if (isLoading) return <Screen><StateView count={3} state="loading" /></Screen>;
  if (error || !data) return <Screen><StateView state="error" title="Profile unavailable" description={error ?? 'No profile found.'}
    actionLabel="Try again" onAction={() => void retry()} /></Screen>;
  if (!data.isAdmin) return <Screen><StateView state="error" title="Administrator access required"
    description="Only a family administrator can edit elder information." /></Screen>;
  return <EditForm data={data} />;
}

function EditForm({ data }: { data: ElderProfileData }) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ElderProfileFormValues>({
    resolver: zodResolver(elderProfileSchema),
    defaultValues: {
      fullName: data.elder.full_name, dateOfBirth: data.elder.date_of_birth ?? '',
      relationship: data.elder.relationship ?? '', phone: data.elder.phone ?? '', address: data.elder.address ?? '',
      conditions: data.conditions.map((item) => item.condition_name).join(', '),
      allergies: data.allergies.map((item) => item.allergy_name).join(', '),
      contactName: data.contact?.name ?? '', contactRelationship: data.contact?.relationship ?? '',
      contactPhone: data.contact?.phone ?? '', notes: data.elder.notes ?? '',
    },
  });
  const submit = async (values: ElderProfileFormValues) => {
    setSaveError(null); setSaved(false);
    const split = (value: string) => value.split(',').map((x) => x.trim()).filter(Boolean);
    const { error } = await supabase.rpc('save_elder_profile', {
      p_elder_id: data.elder.id, p_full_name: values.fullName, p_date_of_birth: values.dateOfBirth || null,
      p_relationship: values.relationship, p_phone: values.phone, p_address: values.address, p_notes: values.notes,
      p_conditions: split(values.conditions), p_allergies: split(values.allergies),
      p_contact_name: values.contactName, p_contact_relationship: values.contactRelationship, p_contact_phone: values.contactPhone,
    });
    if (error) { setSaveError(error.message); return; }
    setSaved(true);
  };
  const fields: { name: keyof ElderProfileFormValues; label: string; placeholder?: string; multiline?: boolean }[] = [
    { name: 'fullName', label: 'Elder name' }, { name: 'dateOfBirth', label: 'Date of birth', placeholder: 'YYYY-MM-DD' },
    { name: 'relationship', label: 'Relationship' }, { name: 'phone', label: 'Phone number' },
    { name: 'address', label: 'Address', multiline: true }, { name: 'conditions', label: 'Medical conditions', placeholder: 'Separate with commas' },
    { name: 'allergies', label: 'Allergies', placeholder: 'Separate with commas' }, { name: 'contactName', label: 'Emergency contact name' },
    { name: 'contactRelationship', label: 'Emergency contact relationship' }, { name: 'contactPhone', label: 'Emergency contact phone' },
    { name: 'notes', label: 'Care notes', multiline: true },
  ];
  return <Screen><SectionHeader title="Edit elder profile" description="Keep essential care and emergency details current." />
    {saveError ? <FeedbackBanner tone="error" message={saveError} /> : null}
    {saved ? (
      <FeedbackBanner tone="success" message="Elder profile updated. Dashboard and Emergency Mode will show the latest details." />
    ) : null}
    <AppCard>{fields.map((item) => <Controller key={item.name} control={control} name={item.name} render={({ field }) =>
      <FormField label={item.label} placeholder={item.placeholder} multiline={item.multiline}
        error={errors[item.name]?.message} value={field.value} onBlur={field.onBlur} onChangeText={field.onChange} />} />)}
      <AppButton label="Save changes" loading={isSubmitting} onPress={handleSubmit(submit)} /></AppCard>
    {saved ? <AppButton label="Return to elder profile" onPress={() => router.replace('/elder-profile' as never)} /> : null}
  </Screen>;
}
