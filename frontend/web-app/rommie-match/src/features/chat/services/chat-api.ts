import { apiClient } from "@/services/api-client";
import type { Page } from "@/services/paging";
import type { Conversation, Message } from "../types/chat-types";
export const chatApi = {
  list: (page = 1) =>
    apiClient<Page<Conversation>>(`/api/chat/conversations?page=${page}`, {
      authenticated: true,
    }),
  start: (userId: string) =>
    apiClient<Conversation>("/api/chat/conversations", {
      method: "POST",
      body: { userId },
      authenticated: true,
    }),
  get: (id: string) =>
    apiClient<Conversation>(`/api/chat/conversations/${id}`, {
      authenticated: true,
    }),
  messages: (id: string, beforeId?: string) =>
    apiClient<{ items: Message[]; hasMore: boolean }>(
      `/api/chat/conversations/${id}/messages?limit=30${beforeId ? `&beforeId=${beforeId}` : ""}`,
      { authenticated: true },
    ),
  send: (id: string, content: string, imageUrl?: string) =>
    apiClient<Message>(`/api/chat/conversations/${id}/messages`, {
      method: "POST",
      body: { content, imageUrl: imageUrl ?? null },
      authenticated: true,
    }),
  read: (id: string) =>
    apiClient(`/api/chat/conversations/${id}/read`, {
      method: "POST",
      authenticated: true,
    }),
};
