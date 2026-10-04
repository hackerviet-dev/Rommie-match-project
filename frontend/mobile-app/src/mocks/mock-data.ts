// Giao diện mẫu cho Giai đoạn 0. Các giai đoạn sau thay bằng dữ liệu từ API.
import { Droplets, Shirt, Wifi, Wrench } from "lucide-react-native";

export const chats = [
  {
    initials: "NL",
    last: "Mai mình ghé xem phòng sau giờ làm nhé?",
    name: "Nguyễn Linh",
    time: "12 phút",
    unread: true,
  },
  {
    initials: "TM",
    last: "Mình vừa gửi lịch sinh hoạt và ngân sách.",
    name: "Trần Minh",
    time: "1 giờ",
    unread: false,
  },
  {
    initials: "HM",
    last: "Bạn có muốn đặt giờ yên tĩnh sau 22h không?",
    name: "Hà My",
    time: "3 giờ",
    unread: false,
  },
];

export const nearbyServices = [
  {
    color: "bg-sky-50",
    distance: "0,4 km",
    icon: Droplets,
    name: "Giao nước",
    price: "Từ 25.000₫",
  },
  {
    color: "bg-teal/10",
    distance: "0,7 km",
    icon: Shirt,
    name: "Giặt ủi",
    price: "Từ 20.000₫",
  },
  {
    color: "bg-amber-50",
    distance: "1,1 km",
    icon: Wrench,
    name: "Sửa chữa",
    price: "Từ 80.000₫",
  },
  {
    color: "bg-mint/20",
    distance: "1,6 km",
    icon: Wifi,
    name: "Internet",
    price: "Từ 165.000₫",
  },
];
