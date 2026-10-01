import { loginSchema, registerSchema } from "../schemas/auth-schema";
import { apiClient } from "@/services/api-client";
import type { AuthSession, AuthenticatedUser, LoginRequest, RegisterRequest } from "../types/auth-types";

export const authApi = {
  health: () => apiClient<{ module: string; status: string }>("/api/auth/health"),
  logoutAll: () => apiClient<void>("/api/auth/logout-all", { method: "POST", authenticated: true }),
  login: (request: LoginRequest) =>
    apiClient<AuthSession>("/api/auth/login", { method: "POST", body: loginSchema.parse(request) }),
  register: (request: RegisterRequest) =>
    apiClient<AuthSession>("/api/auth/register", { method: "POST", body: registerSchema.parse(request) }),
  refresh: (refreshToken: string) =>
    apiClient<AuthSession>("/api/auth/refresh", { method: "POST", body: { refreshToken } }),
  logout: (refreshToken: string) =>
    apiClient<void>("/api/auth/logout", { method: "POST", body: { refreshToken } }),
  me: () => apiClient<AuthenticatedUser>("/api/auth/me", { authenticated: true }),
};
