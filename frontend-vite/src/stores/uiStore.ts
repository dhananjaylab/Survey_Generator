import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UIState, Notification, ModalState } from '@/types/store';

// Extend notification with optional duration
export type OmitId<T> = Omit<T, 'id'>;

interface UIStore extends UIState {
  setIsLoading: (isLoading: boolean) => void;
  addNotification: (notification: OmitId<Notification>) => string;
  removeNotification: (id: string) => void;
  openModal: (modal: OmitId<ModalState>) => string;
  closeModal: (id: string) => void;
  setSidebarOpen: (sidebarOpen: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const initialState: UIState = {
  isLoading: false,
  notifications: [],
  modals: [],
  sidebarOpen: true,
  theme: 'light',
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      ...initialState,

      setIsLoading: (isLoading) => set({ isLoading }),

      addNotification: (notification) => {
        const id = Math.random().toString(36).substring(2, 9);
        set((state) => ({
          notifications: [...state.notifications, { ...notification, id }],
        }));
        return id;
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      openModal: (modal) => {
        const id = Math.random().toString(36).substring(2, 9);
        set((state) => ({
          modals: [...state.modals, { ...modal, id, isOpen: true }],
        }));
        return id;
      },

      closeModal: (id) =>
        set((state) => ({
          modals: state.modals.map((m) =>
            m.id === id ? { ...m, isOpen: false } : m
          ),
        })),

      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setTheme: (theme) => set({ theme }),

      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({ 
        sidebarOpen: state.sidebarOpen,
        theme: state.theme 
      }), // Persist user preferences
    }
  )
);
