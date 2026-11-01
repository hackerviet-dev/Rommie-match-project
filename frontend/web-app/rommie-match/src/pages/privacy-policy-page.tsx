import { Link } from "react-router-dom";
import { Logo } from "@/layouts/main-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BarChart3, Check, Database, Lock, Share2, Trash2, UserCheck } from "lucide-react";

const LAST_UPDATED = "01/11/2026";

function PublicNav() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-border/50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Trang chủ</Link>
          <Link to="/community-guidelines" className="hover:text-foreground">Quy tắc cộng đồng</Link>
          <Link to="/privacy" className="text-navy font-semibold">Chính sách bảo mật</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost" className="rounded-full">Đăng nhập</Button></Link>
          <Link to="/register"><Button className="rounded-full bg-navy hover:bg-navy/90 text-white">Đăng ký</Button></Link>
        </div>
      </div>
    </header>
  );
}

const SECTIONS = [
  {
    icon: Database,
    title: "Dữ liệu chúng tôi thu thập",
    body: "Chúng tôi chỉ thu thập dữ liệu cần thiết để ghép bạn cùng phòng và vận hành dịch vụ.",
    bullets: [
      "Thông tin tài khoản: họ tên, email, mật khẩu đã mã hóa hoặc thông tin đăng nhập Google.",
      "Hồ sơ: giới tính, thành phố, nghề nghiệp, ảnh đại diện, câu trả lời bài trắc nghiệm thói quen sống.",
      "Vị trí gần đúng (nếu bạn cho phép) để gợi ý phòng và bạn cùng phòng gần bạn.",
      "Nội dung bạn tạo: tin nhắn, tin đăng phòng, đặt dịch vụ, báo cáo và góp ý.",
      "Lịch sử thanh toán gói Premium. Thông tin thẻ/tài khoản ngân hàng do cổng thanh toán payOS xử lý, RoomieMatch không lưu.",
    ],
  },
  {
    icon: UserCheck,
    title: "Mục đích sử dụng",
    body: "Dữ liệu được dùng để cung cấp và cải thiện RoomieMatch, không dùng để bán cho bên thứ ba.",
    bullets: [
      "Tính điểm tương thích và gợi ý bạn cùng phòng phù hợp.",
      "Cho phép nhắn tin, đăng phòng, đặt dịch vụ và thanh toán.",
      "Kiểm duyệt nội dung, xử lý báo cáo vi phạm và bảo vệ cộng đồng.",
      "Gửi thông báo liên quan đến tài khoản và hoạt động của bạn.",
    ],
  },
  {
    icon: BarChart3,
    title: "Google Analytics",
    body: "Trang web RoomieMatch dùng Google Analytics 4 để đo lường lượt truy cập ẩn danh, giúp chúng tôi biết trang nào hữu ích và cần cải thiện.",
    bullets: [
      "Chỉ ghi nhận lượt xem các trang công khai; không ghi nhận trang tin nhắn, hồ sơ, cài đặt, nhóm, tranh chấp và trang quản trị.",
      "Mã định danh trong đường dẫn (ví dụ mã phòng, mã người dùng) được ẩn trước khi gửi.",
      "Đã tắt Google Signals và cá nhân hóa quảng cáo; dữ liệu không dùng cho quảng cáo.",
      "Google Analytics dùng cookie của Google. Bạn có thể chặn bằng cài đặt trình duyệt hoặc tiện ích Google Analytics Opt-out.",
    ],
  },
  {
    icon: Share2,
    title: "Chia sẻ dữ liệu",
    body: "Chúng tôi chỉ chia sẻ dữ liệu khi cần để vận hành dịch vụ hoặc khi pháp luật yêu cầu.",
    bullets: [
      "Người dùng khác chỉ thấy thông tin hồ sơ bạn công khai và tin nhắn bạn gửi cho họ.",
      "Nhà cung cấp hạ tầng: lưu trữ máy chủ, lưu ảnh (Cloudinary), thanh toán (payOS), đăng nhập và đo lường (Google).",
      "Cơ quan nhà nước có thẩm quyền theo quy định pháp luật Việt Nam.",
    ],
  },
  {
    icon: Lock,
    title: "Bảo mật và lưu trữ",
    body: "Dữ liệu được truyền qua kết nối mã hóa HTTPS, mật khẩu được băm và quyền truy cập dữ liệu được giới hạn theo vai trò.",
    bullets: [
      "Chỉ quản trị viên và kiểm duyệt viên được phân quyền mới xem dữ liệu phục vụ kiểm duyệt.",
      "Dữ liệu được lưu trong thời gian tài khoản còn hoạt động hoặc theo thời hạn pháp luật yêu cầu.",
    ],
  },
  {
    icon: Trash2,
    title: "Quyền của bạn",
    body: "Theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân, bạn có quyền kiểm soát dữ liệu của mình.",
    bullets: [
      "Xem và chỉnh sửa hồ sơ bất cứ lúc nào trong phần Cài đặt.",
      "Rút lại sự đồng ý bằng cách ngừng sử dụng hoặc xóa tài khoản.",
      "Yêu cầu xóa tài khoản và dữ liệu cá nhân tại trang Xóa tài khoản.",
      "Gửi câu hỏi hoặc khiếu nại về quyền riêng tư qua mục Góp ý trong ứng dụng.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-16">
        <div className="text-center">
          <Badge variant="outline" className="rounded-full">Cập nhật ngày {LAST_UPDATED}</Badge>
          <h1 className="mt-4 text-4xl md:text-5xl font-display font-extrabold tracking-tight">
            Chính sách bảo mật
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Chính sách này giải thích RoomieMatch thu thập, sử dụng và bảo vệ dữ liệu của bạn như thế nào trên trang web và ứng dụng di động.
          </p>
        </div>

        <div className="mt-12 space-y-6">
          {SECTIONS.map((s, i) => (
            <Card key={i} className="p-6 md:p-8 rounded-2xl border-0 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-mint/40 grid place-items-center text-navy">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{s.title}</h2>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{s.body}</p>
                  <ul className="mt-4 space-y-2">
                    {s.bullets.map((b, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-teal mt-0.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Separator className="my-12" />

        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-display font-bold">Thay đổi chính sách</h2>
          <p className="mt-2 text-muted-foreground">
            Khi chính sách thay đổi, chúng tôi sẽ cập nhật ngày ở đầu trang và thông báo trong ứng dụng nếu thay đổi ảnh hưởng đáng kể đến quyền của bạn.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/delete-account">
              <Button variant="outline" className="rounded-full">Xóa tài khoản</Button>
            </Link>
            <Link to="/">
              <Button className="rounded-full bg-navy hover:bg-navy/90 text-white">Về trang chủ</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
