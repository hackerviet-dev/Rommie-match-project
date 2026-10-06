import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getActorHome, useAuthStore } from "@/features/auth";
import { LoaderCircle } from "lucide-react";
import { tokenStorage } from "@/services/token-storage";

export function AuthGuard({
  children,
  staff = false,
  memberHome = false,
}: {
  children: ReactNode;
  staff?: boolean;
  memberHome?: boolean;
}) {
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const location = useLocation();
  if (!isInitialized)
    return (
      <div
        role="status"
        className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground"
      >
        <LoaderCircle
          aria-hidden="true"
          className="h-7 w-7 animate-spin text-teal motion-reduce:animate-none"
        />
        Đang kiểm tra phiên đăng nhập…
      </div>
    );
  if (
    !isAuthenticated ||
    !user ||
    (!tokenStorage.getAccessToken() && !tokenStorage.getRefreshToken())
  )
    return (
      <Navigate
        to="/login"
        replace
        state={{
          returnTo: location.pathname + location.search + location.hash,
        }}
      />
    );
  const home = getActorHome(user.role);
  const isStaff = user.role === "admin" || user.role === "moderator";
  if ((staff && !isStaff) || (memberHome && isStaff))
    return <Navigate to={home} replace />;
  if (staff) {
    const root = location.pathname.split("/")[1];
    if (`/${root}` !== home)
      return <Navigate to={home + location.pathname.slice(root.length + 1) + location.search + location.hash} replace />;
  }
  return children;
}
