import { ROUTES } from "@/constants/routes";

export function getActorHome(role?: string | null) {
  if (!role) return ROUTES.landing;
  if (role === "admin") return ROUTES.admin;
  if (role === "moderator") return ROUTES.moderator;
  return ROUTES.dashboard;
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
  const staffRoot = [ROUTES.admin, ROUTES.moderator].find(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
  if (staffRoot) {
    if (role !== "admin" && role !== "moderator") return home;
    return home + returnTo.slice(staffRoot.length);
  }
  return returnTo;
}
