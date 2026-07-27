import { create } from "zustand";
import type { AuthUser, DashboardData, NotificationItem, UserProfile } from "../types/api";

type SessionState = {
  token: string | null;
  user: AuthUser | null;
  profile: UserProfile | null;
  dashboard: DashboardData | null;
  notifications: NotificationItem[];
  authModalOpen: boolean;
  notificationsOpen: boolean;
  setSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
  setProfile: (profile: UserProfile | null) => void;
  setDashboard: (dashboard: DashboardData | null) => void;
  setNotifications: (notifications: NotificationItem[]) => void;
  setAuthModalOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  token: window.localStorage.getItem("arena-camp-token"),
  user: null,
  profile: null,
  dashboard: null,
  notifications: [],
  authModalOpen: false,
  notificationsOpen: false,
  setSession: (token, user) =>
    set(() => {
      window.localStorage.setItem("arena-camp-token", token);
      return { token, user };
    }),
  clearSession: () =>
    set(() => {
      window.localStorage.removeItem("arena-camp-token");
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
