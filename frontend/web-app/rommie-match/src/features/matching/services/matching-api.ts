import { apiClient } from "@/services/api-client";
import type {
  MatchRecalculation,
  RoommateMatch,
  MatchFilters,
  MatchUsage,
  MatchDetail,
  MatchRequest,
} from "../types/matching-types";
import { queryString, type Page } from "@/services/paging";

export const matchingApi = {
  list: (filters: MatchFilters = {}) =>
    apiClient<Page<RoommateMatch>>(
      `/api/matching/me/matches${queryString(filters)}`,
      { authenticated: true },
    ),
  detail: (id: string) =>
    apiClient<MatchDetail>(`/api/matching/me/matches/${id}`, {
      authenticated: true,
    }),
  usage: () =>
    apiClient<MatchUsage>("/api/matching/me/usage", { authenticated: true }),
  boost: () =>
    apiClient<{ id: string; endsAt: string }>("/api/matching/me/boost", {
      method: "POST",
      authenticated: true,
    }),
  requests: (page = 1) =>
    apiClient<Page<MatchRequest>>(`/api/matching/requests?page=${page}`, {
      authenticated: true,
    }),
  request: (candidateId: string, message?: string) =>
    apiClient<MatchRequest>("/api/matching/requests", {
      method: "POST",
      body: { candidateId, message },
      authenticated: true,
    }),
  respond: (id: string, action: "accept" | "decline" | "cancel" | "end") =>
    apiClient<MatchRequest>(`/api/matching/requests/${id}/${action}`, {
      method: "POST",
      authenticated: true,
    }),
  recalculate: () =>
    apiClient<MatchRecalculation>("/api/matching/me/recalculate", {
      method: "POST",
      authenticated: true,
    }),
};
