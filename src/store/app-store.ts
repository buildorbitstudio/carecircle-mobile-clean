import { create } from 'zustand';

export type AppRole = 'admin' | 'member' | 'elder';

type AppState = {
  activeElderId: string | null;
  role: AppRole | null;
  onboarding: {
    fullName: string;
    familyName: string;
    elderFullName: string;
    elderDateOfBirth: string;
    primaryDoctor: string;
    pharmacy: string;
  };
  setActiveElder: (id: string | null) => void;
  setRole: (role: AppRole | null) => void;
  updateOnboarding: (values: Partial<AppState['onboarding']>) => void;
  resetOnboarding: () => void;
  reset: () => void;
};

const emptyOnboarding = {
  fullName: '',
  familyName: '',
  elderFullName: '',
  elderDateOfBirth: '',
  primaryDoctor: '',
  pharmacy: '',
};

export const useAppStore = create<AppState>((set) => ({
  activeElderId: null,
  role: null,
  onboarding: emptyOnboarding,
  setActiveElder: (activeElderId) => set({ activeElderId }),
  setRole: (role) => set({ role }),
  updateOnboarding: (values) =>
    set((state) => ({ onboarding: { ...state.onboarding, ...values } })),
  resetOnboarding: () => set({ onboarding: emptyOnboarding }),
  reset: () => set({ activeElderId: null, role: null, onboarding: emptyOnboarding }),
}));
