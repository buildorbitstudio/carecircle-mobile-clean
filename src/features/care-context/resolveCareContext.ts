import { supabase } from '@/lib/supabase';
import { AccountMode, AppRole } from '@/store/app-store';

type MembershipRow = {
  family_id: string;
  role: AppRole;
  created_at: string;
};

type FamilyRow = {
  id: string;
  name: string;
  is_personal?: boolean | null;
};

export type ResolvedCareContext = {
  familyId: string;
  familyName: string;
  elderId: string;
  elderName: string;
  isAdmin: boolean;
  isPersonal: boolean;
  role: AppRole;
};

export async function ensurePersonalCareProfile() {
  const { data, error } = await supabase.rpc('ensure_personal_care_profile');
  if (error) throw error;
  return data as { family_id: string; elder_profile_id: string; role: AppRole };
}

export async function resolveCareContext({
  accountMode,
  activeElderId,
  activeFamilyId,
  userId,
}: {
  accountMode: AccountMode;
  activeElderId: string | null;
  activeFamilyId: string | null;
  userId: string;
}): Promise<ResolvedCareContext> {
  if (accountMode === 'individual') {
    await ensurePersonalCareProfile();
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('family_members')
    .select('family_id, role, created_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (membershipError) throw membershipError;
  if (!memberships?.length) throw new Error('No active care account was found.');

  const familyIds = memberships.map((membership) => membership.family_id);
  const { data: families, error: familiesError } = await supabase
    .from('families')
    .select('id, name, is_personal')
    .in('id', familyIds);

  if (familiesError) {
    const fallbackFamilies = await supabase
      .from('families')
      .select('id, name')
      .in('id', familyIds);

    if (fallbackFamilies.error) throw fallbackFamilies.error;
    return resolveFromRows({
      accountMode,
      activeElderId,
      activeFamilyId,
      families: (fallbackFamilies.data ?? []).map((family) => ({
        ...family,
        is_personal: false,
      })),
      memberships: memberships as MembershipRow[],
      userId,
    });
  }

  return resolveFromRows({
    accountMode,
    activeElderId,
    activeFamilyId,
    families: (families ?? []) as FamilyRow[],
    memberships: memberships as MembershipRow[],
    userId,
  });
}

async function resolveFromRows({
  accountMode,
  activeElderId,
  activeFamilyId,
  families,
  memberships,
  userId,
}: {
  accountMode: AccountMode;
  activeElderId: string | null;
  activeFamilyId: string | null;
  families: FamilyRow[];
  memberships: MembershipRow[];
  userId: string;
}) {
  const familyById = new Map(families.map((family) => [family.id, family]));
  const enriched = memberships.map((membership) => ({
    ...membership,
    family: familyById.get(membership.family_id),
  }));

  const preferred =
    enriched.find((membership) => membership.family_id === activeFamilyId) ??
    enriched.find((membership) =>
      accountMode === 'individual'
        ? Boolean(membership.family?.is_personal)
        : !membership.family?.is_personal,
    ) ??
    enriched[0];

  if (!preferred?.family) throw new Error('Unable to load the selected care account.');

  const { data: elders, error: elderError } = await supabase
    .from('elder_profiles')
    .select('id, full_name, user_id, created_at')
    .eq('family_id', preferred.family_id)
    .order('created_at', { ascending: true });

  if (elderError) throw elderError;
  const elder =
    elders?.find((item) => item.id === activeElderId) ??
    (preferred.family.is_personal ? elders?.find((item) => item.user_id === userId) : undefined) ??
    elders?.[0];

  if (!elder) throw new Error('No care profile was found for this account.');

  return {
    elderId: elder.id,
    elderName: elder.full_name,
    familyId: preferred.family_id,
    familyName: preferred.family.name,
    isAdmin: preferred.role === 'admin',
    isPersonal: Boolean(preferred.family.is_personal),
    role: preferred.role,
  };
}
