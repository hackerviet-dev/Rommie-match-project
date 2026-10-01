import { create } from "zustand";
import { tokenStorage } from "@/services/token-storage";
import type { AuthSession, AuthenticatedUser } from "../types/auth-types";

export type User = { id: string; name: string; email: string; avatar: string; role: string };
type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (session: AuthSession) => void;
  setUser: (user: AuthenticatedUser) => void;
  logout: () => void;
  initialize: () => void;
  updateUser: (patch: Partial<User>) => void;
};
const toUser = (user: AuthenticatedUser): User => ({
  id: user.id, name: user.displayName, email: user.email, role: user.role,
  avatar: user.avatarUrl ?? "https://api.dicebear.com/9.x/avataaars/svg?seed=Me",
});
export const useAuthStore = create<AuthState>((set) => ({
  user: null, isAuthenticated: false, isInitialized: false,
  login: (session) => {
    tokenStorage.setTokens(session.accessToken, session.refreshToken);
    set({ user: toUser(session.user), isAuthenticated: true, isInitialized: true });
  },
  setUser: (user) => set({ user: toUser(user), isAuthenticated: true, isInitialized: true }),
  logout: () => { tokenStorage.clear(); set({ user: null, isAuthenticated: false, isInitialized: true }); },
  initialize: () => set({ isInitialized: true }),
  updateUser: (patch) => set((state) => ({ user: state.user ? { ...state.user, ...patch } : null })),
}));
