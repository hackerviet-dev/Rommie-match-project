import { apiClient } from "@/services/api-client";
import type { Profile, UpdateProfileRequest } from "../types/profile-types";

export const profileApi = {
  getMine: () => apiClient<Profile>("/api/users/me/profile", { authenticated: true }),
  updateMine: (request: UpdateProfileRequest) =>
    apiClient<Profile>("/api/users/me/profile", { method: "PUT", body: request, authenticated: true }),
  getByUserId: (userId: string) =>
    apiClient<Profile>(`/api/users/${encodeURIComponent(userId)}/profile`, { authenticated: true }),
};
