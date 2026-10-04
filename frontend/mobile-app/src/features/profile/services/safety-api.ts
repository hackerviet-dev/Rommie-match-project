import { apiClient } from "@/services/api-client";
import type { Page } from "@/services/paging";
export type BlockedUser = {
  userId: string;
  displayName: string;
  blockedAt: string;
};
export const safetyApi = {
  blocks: (page = 1) =>
    apiClient<Page<BlockedUser>>(`/api/users/me/blocks?page=${page}`, {
      authenticated: true,
    }),
  block: (id: string) =>
    apiClient<void>(`/api/users/${id}/block`, {
      method: "POST",
      authenticated: true,
    }),
  unblock: (id: string) =>
    apiClient<void>(`/api/users/${id}/block`, {
      method: "DELETE",
      authenticated: true,
    }),
  report: (id: string, reason: string, details: string) =>
    apiClient(`/api/users/${id}/reports`, {
      method: "POST",
      body: { reason, details },
      authenticated: true,
    }),
};
