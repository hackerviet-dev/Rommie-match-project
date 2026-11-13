import { apiClient } from "@/services/api-client";
import type { Page } from "@/services/paging";
import type {
  StaffUser,
  StaffUserDetail,
  StaffRoom,
  Audit,
} from "../types/staff-types";
export type {
  StaffUser,
  StaffUserDetail,
  StaffRoom,
  Audit,
} from "../types/staff-types";
export const staffApi = {
  overview: () =>
    apiClient<{
      pendingRooms: number;
      openDisputes: number;
      groups: number;
      openReports: number;
      pendingVerifications: number;
      newFeedback: number;
    }>("/api/admin/workspace-stats", { authenticated: true }),
  users: (q = "", role = "", page = 1, status = "", plan = "") =>
    apiClient<Page<StaffUser>>(
      `/api/admin/users?q=${encodeURIComponent(q)}${role ? `&role=${role}` : ""}${status ? `&status=${status}` : ""}${plan ? `&plan=${plan}` : ""}&page=${page}`,
      { authenticated: true },
    ),
  user: (id: string) =>
    apiClient<StaffUserDetail>(`/api/admin/users/${id}`, {
      authenticated: true,
    }),
  access: (
    id: string,
    body: { role: string; isActive: boolean; note: string },
  ) =>
    apiClient<void>(`/api/admin/users/${id}/access`, {
      method: "PUT",
      body,
      authenticated: true,
    }),
  deleteUser: (id: string, note: string) =>
    apiClient<void>(`/api/admin/users/${id}/delete`, {
      method: "POST",
      body: { note },
      authenticated: true,
    }),
  restoreUser: (id: string, note: string) =>
    apiClient<void>(`/api/admin/users/${id}/restore`, {
      method: "POST",
      body: { note },
      authenticated: true,
    }),
  purgeUser: (id: string, note: string, confirmEmail: string) =>
    apiClient<void>(`/api/admin/users/${id}/purge`, {
      method: "POST",
      body: { note, confirmEmail },
      authenticated: true,
    }),
  rooms: (status = "pending", page = 1, id = "") =>
    apiClient<Page<StaffRoom>>(
      `/api/admin/rooms?page=${page}${status ? `&status=${status}` : ""}${id ? `&id=${id}` : ""}`,
      { authenticated: true },
    ),
  review: (
    id: string,
    body: { status: string; note: string; message: string; expectedUpdatedAt: string },
  ) =>
    apiClient<void>(`/api/admin/rooms/${id}/review`, {
      method: "POST",
      body,
      authenticated: true,
    }),
  audit: (page = 1) =>
    apiClient<Page<Audit>>(`/api/admin/audit-logs?page=${page}`, {
      authenticated: true,
    }),
};
