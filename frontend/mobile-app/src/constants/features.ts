import { Platform } from "react-native";

// Google Play bắt buộc bán hàng số (gói Premium) qua Google Play Billing, không cho dẫn người
// dùng sang cổng thanh toán khác. Vì vậy bản app cài trên điện thoại mặc định ẩn phần mua gói
// và mọi lời mời nâng cấp; người đã có Premium (mua trên web) vẫn dùng đủ quyền lợi và xem
// được lịch sử giao dịch. Bản web luôn bật. Đặt EXPO_PUBLIC_PREMIUM_PURCHASE=true trong .env
// khi cần thử luồng thanh toán payOS bằng Expo Go; không bật cho bản build lên store.
export const PREMIUM_PURCHASE_ENABLED =
  Platform.OS === "web" || process.env.EXPO_PUBLIC_PREMIUM_PURCHASE === "true";
