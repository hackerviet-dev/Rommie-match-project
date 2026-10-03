import { apiClient } from "@/services/api-client";
import type { Page } from "@/services/paging";
export type AdminReport = {
  id: string;
  reporterId: string;
  reportedUserId: string;
  createdAt: string;
  reviewedAt: string | null;
  reporterName: string;
  reportedUserName: string;
  reason: string;
  details: string | null;
  status: string;
  resolutionNote: string | null;
};
export type AdminVerification = {
  id: string;
  userId: string;
  createdAt: string;
  userName: string;
  status: string;
  frontImageUrl: string;
  backImageUrl: string;
  selfieImageUrl: string | null;
  rejectionReason: string | null;
};
export type AdminRefund = {
  id: string;
  userName: string;
  userEmail: string;
  amount: number;
  status: string;
  reason: string | null;
  transferReference: string | null;
};
export const adminApi = {
  stats: () =>
    apiClient<{
      activeUsers: number;
      openReports: number;
      pendingVerifications: number;
      verifiedProfiles: number;
      newUsersLast30Days: number;
    }>("/api/admin/stats", { authenticated: true }),
  reports: (page = 1, status = "") =>
    apiClient<Page<AdminReport>>(
      `/api/admin/reports?page=${page}${status ? `&status=${status}` : ""}`,
      {
        authenticated: true,
      },
    ),
  verifications: (page = 1, status = "") =>
    apiClient<Page<AdminVerification>>(
      `/api/admin/verifications?page=${page}${status ? `&status=${status}` : ""}`,
      { authenticated: true },
    ),
  reviewReport: (id: string, status: string, resolutionNote: string) =>
    apiClient<void>(`/api/admin/reports/${id}/review`, {
      method: "POST",
      body: { status, resolutionNote },
      authenticated: true,
    }),
  reviewVerification: (id: string, status: string, rejectionReason: string) =>
    apiClient<void>(`/api/admin/verifications/${id}/review`, {
      method: "POST",
      body: { status, rejectionReason },
      authenticated: true,
    }),
  refunds: (page = 1) =>
    apiClient<Page<AdminRefund>>(
      `/api/admin/billing/refund-requests?page=${page}`,
      { authenticated: true },
    ),
  resolveRefund: (
    id: string,
    action: "approve" | "reject",
    note: string,
    transferReference?: string,
  ) =>
    apiClient(`/api/admin/billing/refund-requests/${id}/${action}`, {
      method: "POST",
      body: action === "approve" ? { note, transferReference } : { note },
      authenticated: true,
    }),
};
