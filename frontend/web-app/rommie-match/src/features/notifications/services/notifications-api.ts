import { apiClient } from "@/services/api-client";
import type { Page } from "@/services/paging";

export type ActivityNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: { url?: string; status?: string | null };
  readAt: string | null;
  createdAt: string;
};
const base = "/api/users/me/notifications";
export const notificationsApi = {
  list: (page = 1, unreadOnly = false, pageSize = 20) => apiClient<Page<ActivityNotification>>(`${base}?page=${page}&pageSize=${pageSize}&unreadOnly=${unreadOnly}`, { authenticated: true }),
  unread: () => apiClient<{ count: number }>(`${base}/unread-count`, { authenticated: true }),
  read: (id: string) => apiClient<void>(`${base}/${id}/read`, { authenticated: true, method: "POST" }),
  readAll: () => apiClient<void>(`${base}/read-all`, { authenticated: true, method: "POST" }),
};
