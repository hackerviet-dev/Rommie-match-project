export type Roommate = {
  id: string;
  name: string;
  age: number;
  occupation: string;
  city: string;
  bio: string;
  score: number;
  avatar: string;
  interests: string[];
  breakdown: { label: string; value: number }[];
  budget: string;
  moveIn: string;
};

const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=8FD3C1,15A9B8,b6e3f4`;

export const roommates: Roommate[] = [
  {
    id: "1",
    name: "Nguyễn Linh",
    age: 23,
    occupation: "Nhà thiết kế UX",
    city: "Quận 1, TP.HCM",
    bio: "Mê cà phê, giữ bếp luôn sạch tinh. Yêu phim indie và những sáng Chủ nhật thong thả.",
    score: 96,
    avatar: avatar("Linh"),
    interests: ["Thiết kế", "Cà phê", "Phim", "Yoga"],
    breakdown: [
      { label: "Giờ giấc ngủ", value: 95 },
      { label: "Sạch sẽ", value: 98 },
      { label: "Lối sống xã hội", value: 88 },
      { label: "Ngân sách", value: 92 },
      { label: "Chịu ồn", value: 90 },
    ],
    budget: "4–6 triệu",
    moveIn: "15/01",
  },
  {
    id: "2",
    name: "Trần Minh",
    age: 25,
    occupation: "Kỹ sư phần mềm",
    city: "TP. Thủ Đức",
    bio: "Lập trình viên backend, code ban đêm, leo núi cuối tuần. Thân thiện với thú cưng.",
    score: 92,
    avatar: avatar("Minh"),
    interests: ["Lập trình", "Leo núi", "Chó", "Board game"],
    breakdown: [
      { label: "Giờ giấc ngủ", value: 80 },
      { label: "Sạch sẽ", value: 90 },
      { label: "Lối sống xã hội", value: 95 },
      { label: "Ngân sách", value: 94 },
      { label: "Chịu ồn", value: 92 },
    ],
    budget: "5–7 triệu",
    moveIn: "01/02",
  },
  {
    id: "3",
    name: "Phạm Hà My",
    age: 22,
    occupation: "Thực tập sinh Marketing",
    city: "Bình Thạnh, TP.HCM",
    bio: "Mẹ của cây xanh, nghiện matcha, trầm tính và gọn gàng. Sinh viên FTU.",
    score: 89,
    avatar: avatar("HaMy"),
    interests: ["Cây cảnh", "Matcha", "Đọc sách"],
    breakdown: [
      { label: "Giờ giấc ngủ", value: 92 },
      { label: "Sạch sẽ", value: 95 },
      { label: "Lối sống xã hội", value: 78 },
      { label: "Ngân sách", value: 88 },
      { label: "Chịu ồn", value: 86 },
    ],
    budget: "3–5 triệu",
    moveIn: "20/01",
  },
  {
    id: "4",
    name: "Lê Khoa",
    age: 27,
    occupation: "Kiến trúc sư",
    city: "Quận 3, TP.HCM",
    bio: "Trầm tính, sáng tạo, mê đĩa than. Nấu bữa tối Chủ nhật cho cả nhà.",
    score: 87,
    avatar: avatar("Khoa"),
    interests: ["Kiến trúc", "Đĩa than", "Nấu ăn"],
    breakdown: [
      { label: "Giờ giấc ngủ", value: 85 },
      { label: "Sạch sẽ", value: 92 },
      { label: "Lối sống xã hội", value: 80 },
      { label: "Ngân sách", value: 84 },
      { label: "Chịu ồn", value: 90 },
    ],
    budget: "6–8 triệu",
    moveIn: "01/03",
  },
  {
    id: "5",
    name: "Vũ Trang",
    age: 24,
    occupation: "Dược sĩ",
    city: "Quận 10, TP.HCM",
    bio: "Dậy sớm, tập gym 3 buổi/tuần, rất ngăn nắp. Tìm bạn ở lâu dài, dễ chịu.",
    score: 85,
    avatar: avatar("Trang"),
    interests: ["Thể hình", "Nấu ăn", "K-pop"],
    breakdown: [
      { label: "Giờ giấc ngủ", value: 96 },
      { label: "Sạch sẽ", value: 89 },
      { label: "Lối sống xã hội", value: 72 },
      { label: "Ngân sách", value: 90 },
      { label: "Chịu ồn", value: 88 },
    ],
    budget: "4–6 triệu",
    moveIn: "10/02",
  },
  {
    id: "6",
    name: "Hoàng Duy",
    age: 26,
    occupation: "Nhiếp ảnh gia",
    city: "Quận 2, TP.HCM",
    bio: "Hay đi du lịch, dễ tính, tôn trọng không gian chung. Nuôi mèo.",
    score: 82,
    avatar: avatar("Duy"),
    interests: ["Nhiếp ảnh", "Du lịch", "Mèo"],
    breakdown: [
      { label: "Giờ giấc ngủ", value: 78 },
      { label: "Sạch sẽ", value: 85 },
      { label: "Lối sống xã hội", value: 84 },
      { label: "Ngân sách", value: 80 },
      { label: "Chịu ồn", value: 86 },
    ],
    budget: "5–7 triệu",
    moveIn: "15/03",
  },
];

export const conversations = [
  {
    id: "1",
    name: "Nguyễn Linh",
    avatar: avatar("Linh"),
    last: "Tuyệt vời! Thứ Bảy đi xem căn hộ nhé?",
    time: "2 phút",
    unread: 2,
    online: true,
  },
  {
    id: "2",
    name: "Trần Minh",
    avatar: avatar("Minh"),
    last: "Mình ok chia tiền điện nước 50/50.",
    time: "1 giờ",
    unread: 0,
    online: true,
  },
  {
    id: "3",
    name: "Phạm Hà My",
    avatar: avatar("HaMy"),
    last: "Bạn có phiền nếu mình mang cây không? 🌱",
    time: "3 giờ",
    unread: 1,
    online: false,
  },
  {
    id: "4",
    name: "Lê Khoa",
    avatar: avatar("Khoa"),
    last: "Cảm ơn vì lời giới thiệu nhé!",
    time: "1 ngày",
    unread: 0,
    online: false,
  },
  {
    id: "5",
    name: "Vũ Trang",
    avatar: avatar("Trang"),
    last: "Ngày dọn vào hợp với mình lắm.",
    time: "2 ngày",
    unread: 0,
    online: false,
  },
];

export const sampleMessages = [
  { id: 1, from: "them", text: "Chào bạn! Mình thấy hợp tới 96% — quá đỉnh 😄", time: "10:21" },
  {
    id: 2,
    from: "me",
    text: "Haha đúng vậy! Mình thích hồ sơ của bạn. Bạn còn đang tìm phòng không?",
    time: "10:23",
  },
  { id: 3, from: "them", text: "Còn nhé. Mình dự định dọn vào 15/01 quanh Quận 1.", time: "10:24" },
  {
    id: 4,
    from: "me",
    text: "Cùng khu rồi. Ngân sách của mình tầm 5 triệu, còn bạn?",
    time: "10:25",
  },
  { id: 5, from: "them", text: "4–6 triệu, hợp ghê. Thứ Bảy đi xem phòng nha?", time: "10:26" },
];

export const services = [
  {
    name: "Nước AquaPure",
    category: "Giao nước",
    rating: 4.8,
    distance: "0,4 km",
    price: "25k–80k",
    img: "💧",
  },
  {
    name: "Giặt ủi Clean & Press",
    category: "Giặt ủi",
    rating: 4.7,
    distance: "0,6 km",
    price: "15k/kg",
    img: "🧺",
  },
  {
    name: "Dọn nhà SparkleHome",
    category: "Dọn dẹp",
    rating: 4.9,
    distance: "1,1 km",
    price: "150k–400k",
    img: "🧽",
  },
  {
    name: "Điện Mr. Volt",
    category: "Sửa điện",
    rating: 4.6,
    distance: "0,9 km",
    price: "100k+",
    img: "💡",
  },
  {
    name: "Ống nước FlowFix",
    category: "Sửa ống nước",
    rating: 4.5,
    distance: "1,5 km",
    price: "120k+",
    img: "🔧",
  },
  {
    name: "Internet FiberZone",
    category: "Lắp internet",
    rating: 4.8,
    distance: "2,2 km",
    price: "200k/tháng",
    img: "📶",
  },
];

export const quizQuestions = [
  {
    q: "Bạn cùng phòng muốn mời bạn bè qua chơi mỗi cuối tuần. Bạn cảm thấy thế nào?",
    options: [
      "Quá vui — cứ thoải mái!",
      "Đôi khi cũng được, nếu báo trước",
      "Mình thích cuối tuần yên tĩnh",
    ],
    emoji: "🎉",
  },
  {
    q: "11 giờ đêm, chén dĩa bữa tối vẫn còn trong bồn. Bạn sẽ…",
    options: ["Rửa ngay lập tức", "Để mai sáng rửa", "Nói thật mình có thể quên luôn"],
    emoji: "🍽️",
  },
  {
    q: "Sáng thứ Bảy lý tưởng của bạn là…",
    options: ["Ngủ tới trưa", "Brunch với bạn lúc 10h", "Dậy 6h đi chạy bộ"],
    emoji: "☀️",
  },
  {
    q: "Bạn thích chia chi phí chung như thế nào?",
    options: ["Chia đều cho gọn", "Tính chi li từng món", "Ai mua người đó trả"],
    emoji: "💸",
  },
  {
    q: "Bạn thân muốn ngủ nhờ sofa 3 đêm. Bạn xử lý ra sao?",
    options: [
      "Tất nhiên rồi, cứ tự nhiên",
      "Ok nhưng phải báo bạn cùng phòng",
      "Có khách sạn để làm gì?",
    ],
    emoji: "🛋️",
  },
];
