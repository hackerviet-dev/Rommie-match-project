import { apiClient } from "@/services/api-client";
import type { LifestylePreferences, SaveLifestyleRequest } from "../types/lifestyle-types";

export const lifestyleApi = {
  getMine: () =>
    apiClient<LifestylePreferences>("/api/users/me/lifestyle", { authenticated: true }),
  saveMine: (request: SaveLifestyleRequest) =>
    apiClient<LifestylePreferences>("/api/users/me/lifestyle", {
      method: "PUT",
      body: request,
      authenticated: true,
    }),
};
