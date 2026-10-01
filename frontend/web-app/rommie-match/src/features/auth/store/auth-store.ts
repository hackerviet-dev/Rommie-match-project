import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthSession } from "../types/auth-types";
import { tokenStorage } from "@/services/token-storage";

export function sessionUser(session: AuthSession) {
  return {
    id: session.user.id,
    name: session.user.displayName,
    email: session.user.email,
    avatar: session.user.avatarUrl || "https://api.dicebear.com/9.x/avataaars/svg?seed=Me",
  };
}

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string) => void;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      login: (user, accessToken) => {
        tokenStorage.setAccessToken(accessToken);
        set({ user, accessToken, isAuthenticated: true });
      },
      logout: () => {
        tokenStorage.clear();
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
      updateUser: (patch) =>
        set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
    }),
    { name: "roomiematch-auth", storage: createJSONStorage(() => sessionStorage) },
  ),
);
