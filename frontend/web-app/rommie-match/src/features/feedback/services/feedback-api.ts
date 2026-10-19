import { apiClient } from "@/services/api-client";
import type { Page } from "@/services/paging";

export type FeedbackCategory = "bug" | "suggestion" | "praise" | "other";

export const FEEDBACK_CATEGORIES: Record<FeedbackCategory, string> = {
  bug: "Báo lỗi",
  suggestion: "Đề xuất tính năng",
  praise: "Khen ngợi",
  other: "Khác",
};

export type AdminFeedback = {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  category: FeedbackCategory;
  rating: number | null;
  message: string;
  pagePath: string | null;
  status: "new" | "reviewed";
  staffNote: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export const feedbackApi = {
  create: (body: {
    category: FeedbackCategory;
    message: string;
    rating: number | null;
    pagePath: string | null;
  }) =>
    apiClient("/api/feedback", { method: "POST", body, authenticated: true }),
  list: (page = 1, status = "", category = "") =>
    apiClient<Page<AdminFeedback>>(
      `/api/admin/feedback?page=${page}${status ? `&status=${status}` : ""}${category ? `&category=${category}` : ""}`,
      { authenticated: true },
    ),
  review: (id: string, staffNote: string) =>
    apiClient<void>(`/api/admin/feedback/${id}/review`, {
      method: "POST",
      body: { staffNote },
      authenticated: true,
    }),
};
