import { create } from "zustand";
import { tokenStorage } from "@/services/token-storage";
import type { AuthSession, AuthenticatedUser } from "../types/auth-types";

type AuthState = {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (session: AuthSession) => void;
  setUser: (user: AuthenticatedUser) => void;
  logout: () => void;
  initialize: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  login: (session) => {
    tokenStorage.setTokens(session.accessToken, session.refreshToken);
    set({ user: session.user, isAuthenticated: true, isInitialized: true });
  },
  setUser: (user) => set({ user, isAuthenticated: true, isInitialized: true }),
  logout: () => {
    tokenStorage.clear();
    set({ user: null, isAuthenticated: false, isInitialized: true });
  },
  initialize: () => set({ isInitialized: true }),
}));

export const isStaffRole = (role?: string | null) => role === "admin" || role === "moderator";
