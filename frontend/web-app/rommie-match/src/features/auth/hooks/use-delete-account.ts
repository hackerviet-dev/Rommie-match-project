import { useMutation } from "@tanstack/react-query";

import { ROUTES } from "@/constants/routes";
import { authApi } from "../services/auth-api";
import { useAuthStore } from "../store/auth-store";

// The server revokes every session on success, so only the local session is cleared here.
// A full page load, not a router navigation: PageTransition keeps the settings page mounted
// while it animates out, and its auth guard would send the signed-out user to login instead.
export function useDeleteAccount() {
  return useMutation({
    mutationFn: authApi.deleteAccount,
    onSuccess: () => {
      useAuthStore.getState().logout();
      window.location.replace(`${ROUTES.deleteAccount}?deleted=1`);
    },
  });
}
