import { Ionicons } from '@expo/vector-icons';

export type DocumentType =
  | 'prescription'
  | 'medical_report'
  | 'insurance_card'
  | 'id'
  | 'power_of_attorney'
  | 'test_result'
  | 'other';

export const documentTypes: {
  value: DocumentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'prescription', label: 'Prescription', icon: 'medical' },
  { value: 'medical_report', label: 'Medical report', icon: 'clipboard' },
  { value: 'insurance_card', label: 'Insurance card', icon: 'card' },
  { value: 'id', label: 'ID', icon: 'person-circle' },
  { value: 'power_of_attorney', label: 'Power of attorney', icon: 'shield-checkmark' },
  { value: 'test_result', label: 'Test result', icon: 'flask' },
  { value: 'other', label: 'Other', icon: 'document' },
];

export function documentTypeConfig(type: DocumentType) {
  return documentTypes.find((item) => item.value === type) ?? documentTypes[6];
}
