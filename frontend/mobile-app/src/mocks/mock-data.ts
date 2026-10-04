// Giao diện mẫu cho Giai đoạn 0. Các giai đoạn sau thay bằng dữ liệu từ API.
import { Droplets, Shirt, Wifi, Wrench } from "lucide-react-native";

export type Roommate = {
  age: number;
  budget: string;
  initials: string;
  match: number;
  name: string;
  neighborhood: string;
  occupation: string;
  tags: string[];
  vibe: string;
};

export const roommates: Roommate[] = [
  {
    age: 23,
    budget: "4–6 triệu/tháng",
    initials: "NL",
    match: 96,
    name: "Nguyễn Linh",
    neighborhood: "Quận 1, TP.HCM",
    occupation: "Nhà thiết kế UX",
    tags: ["Ngủ sớm", "Gọn gàng", "Gần trung tâm"],
    vibe: "Thích không gian yên tĩnh, sạch sẽ và tôn trọng thời gian riêng của nhau.",
  },
  {
    age: 25,
    budget: "3–5 triệu/tháng",
    initials: "TM",
    match: 92,
    name: "Trần Minh",
    neighborhood: "Bình Thạnh, TP.HCM",
    occupation: "Kỹ sư phần mềm",
    tags: ["Cú đêm", "Yêu thú cưng", "Không hút thuốc"],
    vibe: "Làm việc linh hoạt, nấu ăn cuối tuần và luôn giữ khu vực chung ngăn nắp.",
  },
  {
    age: 22,
    budget: "3–4 triệu/tháng",
    initials: "HM",
    match: 89,
    name: "Hà My",
    neighborhood: "Thủ Đức, TP.HCM",
    occupation: "Sinh viên năm cuối",
    tags: ["Học khuya", "Thân thiện", "Đi metro"],
    vibe: "Cởi mở, ưu tiên giao tiếp rõ ràng và cần một góc học tập yên tĩnh.",
  },
];

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
