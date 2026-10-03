import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import type { Page } from "@/services/paging";
import { useAuthStore } from "@/features/auth";
export type SavedProfile = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  occupation: string | null;
  city: string;
  savedAt: string;
};
export const savedProfilesApi = {
  ids: () =>
    apiClient<string[]>("/api/users/me/saved-profiles/ids", {
      authenticated: true,
    }),
  list: (page = 1) =>
    apiClient<Page<SavedProfile>>(`/api/users/me/saved-profiles?page=${page}`, {
      authenticated: true,
    }),
  set: (id: string, saved: boolean) =>
    apiClient<void>(`/api/users/${id}/save`, {
      method: saved ? "POST" : "DELETE",
      authenticated: true,
    }),
};
export function useSavedProfiles() {
  const userId = useAuthStore((s) => s.user?.id);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["saved-profiles", "ids", userId],
    queryFn: savedProfilesApi.ids,
    enabled: Boolean(userId),
  });
  const mutation = useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) =>
      savedProfilesApi.set(id, saved),
    onSuccess: () => client.invalidateQueries({ queryKey: ["saved-profiles"] }),
  });
  return { ids: query.data ?? [], query, mutation };
}
