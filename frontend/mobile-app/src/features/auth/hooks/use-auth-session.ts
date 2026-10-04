import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/services/api-error";
import { tokenStorage } from "@/services/token-storage";
import { authApi } from "../services/auth-api";
import { useAuthStore } from "../store/auth-store";

// Khôi phục phiên đã lưu khi mở app. Khác web: lỗi mạng không đẩy người dùng về màn đăng
// nhập (token vẫn còn hợp lệ), mà trả bootError để màn chờ hiện nút thử lại.
export function useAuthSession() {
  const client = useQueryClient();
  const [bootError, setBootError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      tokenStorage.onSessionEnded(() => {
        useAuthStore.setState({ user: null, isAuthenticated: false, isInitialized: true });
        client.clear();
      }),
    [client],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt chỉ dùng để chạy lại.
  useEffect(() => {
    if (useAuthStore.getState().isInitialized) return;
    let cancelled = false;
    setBootError(null);
    (async () => {
      await tokenStorage.load();
      const hasTokens = () =>
        Boolean(tokenStorage.getAccessToken() || tokenStorage.getRefreshToken());
      if (!hasTokens()) return useAuthStore.getState().initialize();
      try {
        const user = await authApi.me();
        if (!cancelled && hasTokens()) useAuthStore.getState().setUser(user);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) useAuthStore.getState().logout();
        else setBootError(error instanceof Error ? error.message : "Không thể khôi phục phiên.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const skip = useCallback(() => useAuthStore.getState().logout(), []);
  return { bootError, retry, skip };
}
