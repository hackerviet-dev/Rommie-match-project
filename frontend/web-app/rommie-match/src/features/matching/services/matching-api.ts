import { apiClient } from "@/services/api-client";
import type { MatchRecalculation, RoommateMatch } from "../types/matching-types";

export const matchingApi = {
  list: () => apiClient<RoommateMatch[]>("/api/matching/matches", { authenticated: true }),
  recalculate: () =>
    apiClient<MatchRecalculation>("/api/matching/me/recalculate", {
      method: "POST",
      authenticated: true,
    }),
};
