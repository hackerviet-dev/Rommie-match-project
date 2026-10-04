import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuthStore } from "@/features/auth";
import { chatApi } from "../services/chat-api";

export function useConversations() {
  const me = useAuthStore((state) => state.user?.id);
  return useInfiniteQuery({
    queryKey: ["chat", "conversations", me],
    queryFn: ({ pageParam }) => chatApi.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    refetchInterval: 15_000,
  });
}

export const openConversation = (id: string) =>
  router.push({ pathname: "/chat/[id]", params: { id } });

// Mở (hoặc tạo) hội thoại với một thành viên rồi chuyển sang màn chat.
export function useStartChat() {
  return useMutation({
    mutationFn: chatApi.start,
    onSuccess: (conversation) => openConversation(conversation.id),
  });
}
