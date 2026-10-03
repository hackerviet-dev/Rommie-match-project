import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { tokenStorage } from "@/services/token-storage";
import { authApi } from "../services/auth-api";
import { useAuthStore } from "../store/auth-store";

export function useSignOut() {
  const client = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (allDevices: boolean) => {
      const refreshToken = tokenStorage.getRefreshToken();
      // Start revocation with the current credentials, then end the local session
      // immediately, including when the server is unavailable.
      const revocation = allDevices ? authApi.logoutAll() : refreshToken ? authApi.logout(refreshToken) : Promise.resolve();
      useAuthStore.getState().logout();
      client.clear();
      navigate("/", { replace: true });
      await revocation;
    },
    onError: () => toast.error("Đã đăng xuất trên trình duyệt này. Chưa thể xác nhận thu hồi phiên trên máy chủ."),
  });
}
