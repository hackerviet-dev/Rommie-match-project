import { create } from "zustand";
import { persist } from "zustand/middleware";

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
};

const DEFAULT_AVATAR = "https://api.dicebear.com/9.x/avataaars/svg?seed=Me";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
      updateUser: (patch) =>
        set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
    }),
    { name: "roomiematch-auth" },
  ),
);

/** Tạo nhanh một user mock từ email/tên người dùng nhập vào biểu mẫu. */
export function makeMockUser(email: string, name?: string): User {
  const safeName = name?.trim() || email.split("@")[0] || "Bạn";
  return {
    id: "me",
    name: safeName,
    email,
    avatar: DEFAULT_AVATAR,
  };
}
