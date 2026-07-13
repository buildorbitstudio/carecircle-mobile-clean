import { FamilyRole } from './family-config';

export type FamilyMember = {
  membershipId: string;
  familyId: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: FamilyRole;
  status: 'active' | 'invited';
  createdAt: string;
  isCurrentUser: boolean;
};

export type FamilyInvitation = {
  id: string;
  family_id: string;
  email: string;
  role: FamilyRole;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  invited_by: string;
  invite_token: string;
  expires_at: string;
  created_at: string;
};
