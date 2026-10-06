import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth";
import { apiClient } from "@/services/api-client";

export type Notification = {
  id: string; type: string; title: string; body: string | null;
  data: { conversationId?: string; roomId?: string; status?: string; roomTitle?: string; url?: string };
  readAt: string | null; createdAt: string;
};
export function useNotifications() {
  const userId = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => apiClient<{ items: Notification[]; unreadCount: number; unreadRoomCount: number }>("/api/notifications", { authenticated: true }),
    enabled: Boolean(userId),
    refetchInterval: 15_000,
    refetchOnWindowFocus: "always",
  });
  const read = useMutation({
    mutationFn: (id: string) => apiClient<void>(`/api/notifications/${id}/read`, { method: "PUT", authenticated: true }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["notifications", userId] });
      void client.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
  const readVisible = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) =>
      apiClient<void>(`/api/notifications/${id}/read`, { method: "PUT", authenticated: true }),
    )),
    onSettled: () => client.invalidateQueries({ queryKey: ["notifications", userId] }),
  });
  return { query, read, readVisible };
}
