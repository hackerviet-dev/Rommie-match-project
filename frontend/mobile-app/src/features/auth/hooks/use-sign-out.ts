import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tokenStorage } from "@/services/token-storage";
import { authApi } from "../services/auth-api";
import { useAuthStore } from "../store/auth-store";

export function useSignOut() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (allDevices: boolean) => {
      const refreshToken = tokenStorage.getRefreshToken();
      // Start revocation with the current credentials, then end the local session
      // immediately, including when the server is unavailable. The router guards in
      // src/app/_layout.tsx move the user to the login screen.
      const revocation = allDevices
        ? authApi.logoutAll()
        : refreshToken
          ? authApi.logout(refreshToken)
          : Promise.resolve();
      useAuthStore.getState().logout();
      client.clear();
      await revocation;
    },
  });
}
