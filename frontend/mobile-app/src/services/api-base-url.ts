import Constants from "expo-constants";

const API_PORT = 5000;

// Địa chỉ backend .NET. EXPO_PUBLIC_API_BASE_URL (file .env) luôn được ưu tiên.
// Nếu không đặt, khi dev bằng Expo Go app gọi API trên chính máy đang chạy Metro:
// hostUri là "IP-LAN:8081", nên điện thoại tới được Docker ở cổng 5000 mà không cần sửa gì.
function resolveApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return `http://${host || "localhost"}:${API_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();
