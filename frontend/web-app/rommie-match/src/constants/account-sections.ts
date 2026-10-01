import { Bookmark, CalendarDays, CreditCard, House, Settings, UserRound } from "lucide-react";

export const ACCOUNT_SECTIONS = [
  { id: "profile", label: "Hồ sơ của tôi", description: "Thông tin cá nhân, lối sống và khảo sát của bạn.", icon: UserRound },
  { id: "saved", label: "Hồ sơ đã lưu", description: "Những người bạn muốn xem lại và kết nối.", icon: Bookmark },
  { id: "rooms", label: "Phòng của tôi", description: "Quản lý phòng bạn muốn tìm người ở ghép.", icon: House },
  { id: "bookings", label: "Lịch đặt dịch vụ", description: "Theo dõi lịch hẹn và dịch vụ đã đặt.", icon: CalendarDays },
  { id: "billing", label: "Gói & thanh toán", description: "Quản lý gói thành viên và lịch sử giao dịch.", icon: CreditCard },
  { id: "settings", label: "Cài đặt & bảo mật", description: "Quyền riêng tư, thông báo và bảo mật tài khoản.", icon: Settings },
] as const;

export type AccountSection = typeof ACCOUNT_SECTIONS[number]["id"];
