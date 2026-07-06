import { router } from 'expo-router';
import { AppButton, AppCard, AppText, Screen, SectionHeader, StateView } from '@/components/ui';
import { useElderProfile } from '@/features/elder-profile/useElderProfile';

export default function ElderProfileScreen() {
  const { data, error, isLoading, retry } = useElderProfile();
  if (isLoading) return <Screen><StateView count={3} state="loading" /></Screen>;
  if (error || !data) return <Screen><StateView state="error" title="Profile unavailable"
    description={error ?? 'No elder profile was found.'} actionLabel="Try again" onAction={() => void retry()} /></Screen>;
  const { elder, conditions, allergies, contact } = data;
  return <Screen>
    <SectionHeader title={elder.full_name} description={elder.relationship || 'Elder family profile'} />
    {data.isAdmin ? <AppButton label="Edit elder profile" onPress={() => router.push('/elder-profile/edit' as never)} /> : null}
    <AppCard><AppText variant="h3">Personal information</AppText>
      <AppText>Date of birth: {elder.date_of_birth || 'Not listed'}</AppText>
      <AppText>Phone: {elder.phone || 'Not listed'}</AppText>
      <AppText>Address: {elder.address || 'Not listed'}</AppText></AppCard>
    <AppCard><AppText variant="h3">Medical conditions</AppText>
      <AppText>{conditions.length ? conditions.map((item: { condition_name: string }) => item.condition_name).join(', ') : 'None listed'}</AppText></AppCard>
    <AppCard><AppText variant="h3">Allergies</AppText>
      <AppText>{allergies.length ? allergies.map((item: { allergy_name: string }) => item.allergy_name).join(', ') : 'None listed'}</AppText></AppCard>
    <AppCard><AppText variant="h3">Primary emergency contact</AppText>
      <AppText>{contact ? `${contact.name} • ${contact.relationship || 'Contact'} • ${contact.phone}` : 'None listed'}</AppText></AppCard>
    {elder.notes ? <AppCard><AppText variant="h3">Care notes</AppText><AppText>{elder.notes}</AppText></AppCard> : null}
  </Screen>;
}
