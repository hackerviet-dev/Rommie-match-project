import { useAuthStore } from "../store/auth-store";
import { getActorHome } from "../utils/actor-home";

export function useStaffPath() {
  return getActorHome(useAuthStore((state) => state.user?.role));
}
