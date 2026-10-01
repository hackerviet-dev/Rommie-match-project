import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { tokenStorage } from "@/services/token-storage";
import { ApiError } from "@/services/api-error";
import { authApi } from "../services/auth-api";
import { useAuthStore } from "../store/auth-store";

export function useAuthSession() {
  useEffect(() => {
    const handleSessionEnded = () => { useAuthStore.setState({ user: null, isAuthenticated: false, isInitialized: true }); };
    window.addEventListener("roomiematch-session-ended", handleSessionEnded);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "roomiematch-access-token" && !event.newValue) handleSessionEnded();
    };
    window.addEventListener("storage", handleStorage);
    return () => { window.removeEventListener("roomiematch-session-ended", handleSessionEnded); window.removeEventListener("storage", handleStorage); };
  }, []);
  const isInitialized = useAuthStore(s => s.isInitialized);
  const session = useQuery({
    queryKey: ["auth", "me"], queryFn: authApi.me,
    enabled: !isInitialized && Boolean(tokenStorage.getAccessToken() || tokenStorage.getRefreshToken()),
    retry: false, staleTime: Infinity,
  });
  useEffect(() => {
    if (isInitialized) return;
    if (session.data) useAuthStore.getState().setUser(session.data);
    else if (session.error instanceof ApiError && session.error.status === 401) useAuthStore.getState().logout();
    else if (session.error || (!tokenStorage.getAccessToken() && !tokenStorage.getRefreshToken())) useAuthStore.getState().initialize();
  }, [isInitialized, session.data, session.error]);
}
