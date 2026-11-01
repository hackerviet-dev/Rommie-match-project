import * as WebBrowser from "expo-web-browser";
import { colors } from "@/theme/colors";

// Trang web công khai (Chính sách bảo mật, hướng dẫn xoá tài khoản) mà Google Play yêu cầu
// liên kết tới. Đặt EXPO_PUBLIC_WEB_URL nếu web chạy ở tên miền khác.
export const WEB_URL = (
  process.env.EXPO_PUBLIC_WEB_URL?.trim() || "https://rommie-match.vercel.app"
).replace(/\/$/, "");
export const PRIVACY_POLICY_URL = `${WEB_URL}/privacy`;
export const DELETE_ACCOUNT_URL = `${WEB_URL}/delete-account`;

export const openWebPage = (url: string) =>
  WebBrowser.openBrowserAsync(url, { controlsColor: colors.navy, toolbarColor: "#ffffff" });
