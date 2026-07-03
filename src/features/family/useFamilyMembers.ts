import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { FamilyInvitation, FamilyMember } from './types';

type FamilyContext = {
  familyId: string;
  familyName: string;
  isAdmin: boolean;
};

export function useFamilyMembers() {
  const { session } = useAuth();
  const [context, setContext] = useState<FamilyContext | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!session?.user.id) return;
      if (refresh) setIsRefreshing(true);
      setError(null);

      try {
        const { data: ownMembership, error: ownError } = await supabase
          .from('family_members')
          .select('family_id, role')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (ownError) throw ownError;
        if (!ownMembership) throw new Error('No active family circle was found.');
        const isAdmin = ownMembership.role === 'admin';

        const [familyResult, membershipsResult, invitationsResult] = await Promise.all([
          supabase
            .from('families')
            .select('name')
            .eq('id', ownMembership.family_id)
            .single(),
          supabase
            .from('family_members')
            .select('id, family_id, user_id, role, status, created_at')
            .eq('family_id', ownMembership.family_id)
            .eq('status', 'active')
            .order('created_at'),
          isAdmin
            ? supabase
                .from('family_invitations')
                .select(
                  'id, family_id, email, role, status, invited_by, expires_at, created_at',
                )
                .eq('family_id', ownMembership.family_id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (familyResult.error) throw familyResult.error;
        if (membershipsResult.error) throw membershipsResult.error;
        if (invitationsResult.error) throw invitationsResult.error;

        const userIds = (membershipsResult.data ?? []).map((member) => member.user_id);
        const profilesResult = userIds.length
          ? await supabase
              .from('users_profile')
              .select('id, full_name, email, avatar_url')
              .in('id', userIds)
          : { data: [], error: null };
        if (profilesResult.error) throw profilesResult.error;
        const profilesById = new Map(
          (profilesResult.data ?? []).map((profile) => [profile.id, profile]),
        );

        setContext({
          familyId: ownMembership.family_id,
          familyName: familyResult.data.name,
          isAdmin,
        });
        setMembers(
          (membershipsResult.data ?? []).map((membership) => {
            const profile = profilesById.get(membership.user_id);
            return {
              membershipId: membership.id,
              familyId: membership.family_id,
              userId: membership.user_id,
              fullName: profile?.full_name ?? 'Family member',
              email: profile?.email ?? '',
              avatarUrl: profile?.avatar_url ?? null,
              role: membership.role,
              status: membership.status,
              createdAt: membership.created_at,
              isCurrentUser: membership.user_id === session.user.id,
            };
          }) as FamilyMember[],
        );
        setInvitations((invitationsResult.data ?? []) as FamilyInvitation[]);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : 'Unable to load family members.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [session],
  );

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!context?.familyId) return;
    const channel = supabase
      .channel(`family-management-${context.familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_members',
          filter: `family_id=eq.${context.familyId}`,
        },
        () => void load(true),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_invitations',
          filter: `family_id=eq.${context.familyId}`,
        },
        () => void load(true),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [context?.familyId, load]);

  return {
    context,
    members,
    invitations,
    isLoading,
    isRefreshing,
    error,
    refresh: () => load(true),
    retry: () => load(),
  };
}
