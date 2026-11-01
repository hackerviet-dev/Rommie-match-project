import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../services/auth-api";
import { useAuthStore } from "../store/auth-store";

// The server revokes every session on success, so only the local session is cleared here;
// the router guards in src/app/_layout.tsx then move the user to the login screen.
export function useDeleteAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: authApi.deleteAccount,
    onSuccess: () => {
      useAuthStore.getState().logout();
      client.clear();
    },
  });
}
