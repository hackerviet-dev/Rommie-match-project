import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getActorHome, useAuthStore } from "@/features/auth";
import { tokenStorage } from "@/services/token-storage";

export function ActorEntry({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  if (
    isInitialized &&
    isAuthenticated &&
    user &&
    (tokenStorage.getAccessToken() || tokenStorage.getRefreshToken())
  ) {
    return <Navigate to={getActorHome(user.role)} replace />;
  }
  return children;
}
