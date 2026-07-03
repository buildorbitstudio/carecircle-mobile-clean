import { create } from 'zustand';

export type AppRole = 'admin' | 'member' | 'elder';

type AppState = {
  activeElderId: string | null;
  role: AppRole | null;
  setActiveElder: (id: string | null) => void;
  setRole: (role: AppRole | null) => void;
  reset: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  activeElderId: null,
  role: null,
  setActiveElder: (activeElderId) => set({ activeElderId }),
  setRole: (role) => set({ role }),
  reset: () => set({ activeElderId: null, role: null }),
}));
