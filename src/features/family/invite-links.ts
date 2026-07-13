import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export function buildFamilyInviteLink(inviteToken: string) {
  const encodedToken = encodeURIComponent(inviteToken);

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/join?token=${encodedToken}`;
  }

  return Linking.createURL('/join', {
    queryParams: { token: inviteToken },
  });
}

export function buildFamilyInviteMessage({
  familyName,
  inviteLink,
}: {
  familyName: string;
  inviteLink: string;
}) {
  return `You've been invited to join ${familyName} on CareCircle.\n\nUse this private link to create an account or sign in:\n${inviteLink}`;
}
