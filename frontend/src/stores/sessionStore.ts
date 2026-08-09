import { create } from "zustand";
import type { AuthUser, DashboardData, NotificationItem, UserProfile } from "../types/api";
import { clearAuthToken, getStoredAuthToken, saveAuthToken } from "../utils/authStorage";

type SessionState = {
  token: string | null;
  user: AuthUser | null;
  profile: UserProfile | null;
  dashboard: DashboardData | null;
  notifications: NotificationItem[];
  authModalOpen: boolean;
  notificationsOpen: boolean;
  setSession: (token: string, user: AuthUser, remember?: boolean) => void;
  clearSession: () => void;
  setProfile: (profile: UserProfile | null) => void;
  setDashboard: (dashboard: DashboardData | null) => void;
  setNotifications: (notifications: NotificationItem[]) => void;
  setAuthModalOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  token: getStoredAuthToken(),
  user: null,
  profile: null,
  dashboard: null,
  notifications: [],
  authModalOpen: false,
  notificationsOpen: false,
  setSession: (token, user, remember) =>
    set(() => {
      saveAuthToken(token, remember);
      return { token, user };
    }),
  clearSession: () =>
    set(() => {
      clearAuthToken();
      return {
        token: null,
        user: null,
        profile: null,
        dashboard: null,
        notifications: []
      };
    }),
  setProfile: (profile) => set({ profile }),
  setDashboard: (dashboard) => set({ dashboard }),
  setNotifications: (notifications) => set({ notifications }),
  setAuthModalOpen: (authModalOpen) => set({ authModalOpen }),
  setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen })
}));
