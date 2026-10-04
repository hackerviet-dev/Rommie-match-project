import {
  Droplets,
  type LucideIcon,
  Shirt,
  Sparkles,
  Store,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react-native";

// Cùng danh mục với trang Dịch vụ của web.
export const SERVICE_CATEGORIES: Record<string, LucideIcon> = {
  "Giao nước": Droplets,
  "Giặt ủi": Shirt,
  "Dọn dẹp": Sparkles,
  "Sửa điện": Zap,
  "Sửa ống nước": Wrench,
  "Lắp internet": Wifi,
};

export const categoryIcon = (category: string) => SERVICE_CATEGORIES[category] ?? Store;
export const DEFAULT_SERVICE_CITY = "TP.HCM";
