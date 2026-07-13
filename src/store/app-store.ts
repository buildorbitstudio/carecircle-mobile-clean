import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppRole = 'admin' | 'member' | 'elder';
export type AccountMode = 'family' | 'individual';

type AppState = {
  activeElderId: string | null;
  activeFamilyId: string | null;
  accountMode: AccountMode;
  role: AppRole | null;
  onboarding: {
    accountType: AccountMode | null;
    fullName: string;
    familyName: string;
    elderFullName: string;
    elderDateOfBirth: string;
    phone: string;
    address: string;
    primaryDoctor: string;
    pharmacy: string;
    emergencyContactName: string;
    emergencyContactRelationship: string;
    emergencyContactPhone: string;
  };
  setAccountMode: (mode: AccountMode) => void;
  setActiveElder: (id: string | null) => void;
  setActiveFamily: (id: string | null) => void;
  setRole: (role: AppRole | null) => void;
  updateOnboarding: (values: Partial<AppState['onboarding']>) => void;
  resetOnboarding: () => void;
  reset: () => void;
};

const emptyOnboarding = {
  accountType: null,
  fullName: '',
  familyName: '',
  elderFullName: '',
  elderDateOfBirth: '',
  phone: '',
  address: '',
  primaryDoctor: '',
  pharmacy: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeElderId: null,
      activeFamilyId: null,
      accountMode: 'family',
      role: null,
      onboarding: emptyOnboarding,
      setAccountMode: (accountMode) => set({ accountMode, activeElderId: null, activeFamilyId: null }),
      setActiveElder: (activeElderId) => set({ activeElderId }),
      setActiveFamily: (activeFamilyId) => set({ activeFamilyId }),
      setRole: (role) => set({ role }),
      updateOnboarding: (values) =>
        set((state) => ({ onboarding: { ...state.onboarding, ...values } })),
      resetOnboarding: () => set({ onboarding: emptyOnboarding }),
      reset: () =>
        set({
          accountMode: 'family',
          activeElderId: null,
          activeFamilyId: null,
          role: null,
          onboarding: emptyOnboarding,
        }),
    }),
    {
      name: 'carecircle-app-state',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accountMode: state.accountMode,
        activeElderId: state.activeElderId,
        activeFamilyId: state.activeFamilyId,
      }),
    },
  ),
);
