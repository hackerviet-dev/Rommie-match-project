import { toast } from "sonner";
import type { AuthenticatedUser } from "../types/auth-types";

export function notifyLoginSuccess(user: AuthenticatedUser) {
  toast.success("Đăng nhập thành công", {
    description: `Chào mừng, ${user.displayName}.`,
    duration: 5000,
    position: "top-right",
    style: {
      backgroundColor: "#15803d",
      borderColor: "#166534",
      color: "#ffffff",
    },
    classNames: { description: "!text-white/90" },
  });
}
