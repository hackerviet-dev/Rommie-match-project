import { apiClient } from "@/services/api-client";
import type { AuthSession, AuthenticatedUser, LoginRequest, RegisterRequest } from "../types/auth-types";

export const authApi = {
  login: (request: LoginRequest) =>
    apiClient<AuthSession>("/api/auth/login", { method: "POST", body: request }),
  register: (request: RegisterRequest) =>
    apiClient<AuthSession>("/api/auth/register", { method: "POST", body: request }),
  refresh: (refreshToken: string) =>
    apiClient<AuthSession>("/api/auth/refresh", { method: "POST", body: { refreshToken } }),
  logout: (refreshToken: string) =>
    apiClient<void>("/api/auth/logout", { method: "POST", body: { refreshToken } }),
  me: () => apiClient<AuthenticatedUser>("/api/auth/me", { authenticated: true }),
};
