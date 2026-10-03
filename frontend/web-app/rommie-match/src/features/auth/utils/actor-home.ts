import { ROUTES } from "@/constants/routes";

export function getActorHome(role?: string | null) {
  if (!role) return ROUTES.landing;
  return role === "admin" || role === "moderator"
    ? ROUTES.admin
    : ROUTES.dashboard;
}

export function getLoginDestination(role: string, returnTo?: string) {
  const home = getActorHome(role);
  if (
    !returnTo?.startsWith("/") ||
    returnTo.startsWith("//") ||
    returnTo.includes("\\")
  )
    return home;
  const pathname = returnTo.split(/[?#]/, 1)[0];
  if (
    [ROUTES.landing, ROUTES.login, ROUTES.register, ROUTES.dashboard].some(
      (path) => path === pathname,
    )
  )
    return home;
  if (
    (pathname === ROUTES.admin || pathname.startsWith(`${ROUTES.admin}/`)) &&
    home !== ROUTES.admin
  )
    return home;
  return returnTo;
}
