import { apiClient } from "@/services/api-client";
import type { Page } from "@/services/paging";
import type { GroupSummary, Group, Dispute } from "../types/workspace-types";
export type { GroupSummary, Group, Dispute } from "../types/workspace-types";
const call = <T>(url: string, method = "GET", body?: unknown) =>
  apiClient<T>(url, { authenticated: true, method, body });
export const workspaceApi = {
  groups: (staff: boolean, page = 1) =>
    call<Page<GroupSummary>>(
      `${staff ? "/api/admin/groups" : "/api/groups/me"}?page=${page}`,
    ),
  group: (id: string, staff: boolean) =>
    call<Group>(`${staff ? "/api/admin/groups" : "/api/groups"}/${id}`),
  createGroup: (body: { name: string; roomId?: string }) =>
    call<{ id: string }>("/api/groups", "POST", body),
  invite: (id: string, email: string) =>
    call<void>(`/api/groups/${id}/invitations`, "POST", { email }),
  respond: (id: string, accept: boolean) =>
    call<void>(`/api/groups/${id}/${accept ? "accept" : "decline"}`, "POST"),
  role: (id: string, userId: string, role: string, staff: boolean) =>
    call<void>(
      `${staff ? "/api/admin/groups" : "/api/groups"}/${id}/members/${userId}/role`,
      "PUT",
      { role },
    ),
  leave: (id: string) => call<void>(`/api/groups/${id}/leave`, "POST"),
  remove: (id: string, userId: string) =>
    call<void>(`/api/groups/${id}/members/${userId}`, "DELETE"),
  disputes: (staff: boolean, page = 1, status = "") =>
    call<Page<Dispute>>(
      `${staff ? "/api/admin/disputes" : "/api/disputes/me"}?page=${page}&status=${status}`,
    ),
  dispute: (id: string, staff: boolean) =>
    call<Dispute>(`${staff ? "/api/admin/disputes" : "/api/disputes"}/${id}`),
  createDispute: (body: {
    respondentId: string;
    roomId?: string;
    groupId?: string;
    title: string;
    details: string;
  }) => call<{ id: string }>("/api/disputes", "POST", body),
  message: (id: string, staff: boolean, content: string) =>
    call<void>(
      `${staff ? "/api/admin/disputes" : "/api/disputes"}/${id}/messages`,
      "POST",
      { content },
    ),
  review: (id: string, status: string, note: string) =>
    call<void>(`/api/admin/disputes/${id}/review`, "POST", { status, note }),
};
