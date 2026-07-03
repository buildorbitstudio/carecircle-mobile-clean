import { Ionicons } from '@expo/vector-icons';

export type FamilyRole = 'admin' | 'member' | 'elder';

export const familyRoles: {
  value: FamilyRole;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Can manage care information, documents, invitations, and roles.',
    icon: 'shield-checkmark',
  },
  {
    value: 'member',
    label: 'Family Member',
    description: 'Can coordinate care, send pings, and complete family tasks.',
    icon: 'people',
  },
  {
    value: 'elder',
    label: 'Elder',
    description: 'Uses the simplified Elder Mode for pings and reminders.',
    icon: 'heart',
  },
];

export function familyRoleConfig(role: FamilyRole) {
  return familyRoles.find((item) => item.value === role) ?? familyRoles[1];
}
