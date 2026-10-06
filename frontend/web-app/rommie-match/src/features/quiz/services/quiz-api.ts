import { apiClient } from "@/services/api-client";
import { ApiError } from "@/services/api-error";
import type { Quiz, QuizResult } from "../types/quiz-types";

export const quizApi = {
  get: () => apiClient<Quiz>("/api/matching/quiz", { authenticated: true }),
  getMine: async () => {
    try { return await apiClient<QuizResult | undefined>("/api/matching/me/quiz", { authenticated: true }) ?? null; }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
  },
  saveMine: (answers: Record<string, string>) => apiClient<QuizResult>("/api/matching/me/quiz", { method: "PUT", body: { answers }, authenticated: true }),
};
