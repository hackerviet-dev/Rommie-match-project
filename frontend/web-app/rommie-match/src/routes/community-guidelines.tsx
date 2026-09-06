import { Link } from "react-router-dom";
import { Logo } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Users, Shield, MessageSquare, AlertTriangle, Check, Flag } from "lucide-react";


function PublicNav() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-border/50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Trang chủ</Link>
          <Link to="/community-guidelines" className="text-navy font-semibold">Quy tắc cộng đồng</Link>
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
    icon: Users,
    title: "Tôn trọng lẫn nhau",
    body: "Mọi người dùng đều xứng đáng được đối xử lịch sự, công bằng và tôn trọng. Không phân biệt đối xử, xúc phạm hoặc công kích dựa trên giới tính, tuổi tác, nguồn gốc, tôn giáo, nghề nghiệp hay lối sống.",
    bullets: [
      "Không dùng ngôn từ thù ghét, kỳ thị hoặc khiêu dâm.",
      "Tranh luận có văn hóa, không công kích cá nhân.",
      "Tôn trọng quyết định từ chối ghép đôi của người khác.",
    ],
  },
  {
    icon: Shield,
    title: "Trung thực và an toàn",
    body: "Hồ sơ của bạn là cơ sở để ghép đôi. Thông tin sai lệch không chỉ làm giảm trải nghiệm của bạn mà còn ảnh hưởng đến người khác.",
    bullets: [
      "Cung cấp thông tin thật về bản thân, thói quen và nhu cầu ở chung.",
      "Không giả mạo danh tính, ảnh đại diện hoặc trường học/công ty.",
      "Không chia sẻ thông tin nhạy cảm quá sớm như số tài khoản, mật khẩu.",
    ],
  },
  {
    icon: MessageSquare,
    title: "Giao tiếp lành mạnh",
    body: "Tin nhắn và cuộc gọi là cầu nối để tìm hiểu bạn cùng phòng. Hãy giữ nó cởi mở, trung thực và an toàn.",
    bullets: [
      "Không spam, quấy rối hoặc gây áp lực khi người khác từ chối.",
      "Không gửi nội dung bạo lực, khiêu dâm hoặc vi phạm pháp luật.",
      "Trả lời tin nhắn và hẹn gặp đúng giờ nếu đã đồng ý.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Hành vi bị cấm",
    body: "RoomieMatch nghiêm cấm các hành vi gian lận, lừa đảo và gây rối. Vi phạm có thể dẫn đến khóa tài khoản vĩnh viễn.",
    bullets: [
      "Lừa đảo tiền cọc, tiền thuê nhà hoặc thông tin cá nhân.",
      "Quảng cáo dịch vụ, rao bán phòng trá hình spam.",
      "Đe dọa, quấy rối, theo dõi hoặc đăng thông tin riêng tư của người khác.",
    ],
  },
  {
    icon: Flag,
    title: "Báo cáo và chế tài",
    body: "Cộng đồng được duy trì nhờ sự chủ động của bạn. Mọi báo cáo đều được xử lý kín đáo và khách quan.",
    bullets: [
      "Dùng nút báo cáo trong hồ sơ hoặc tin nhắn khi phát hiện vi phạm.",
      "Đội ngũ sẽ xem xét, yêu cầu chỉnh sửa hoặc khóa tài khoản tùy mức độ.",
      "Báo cáo sai sự thật lặp lại cũng sẽ bị xử lý.",
    ],
  },
];

export default function CommunityGuidelines() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-16">
        <div className="text-center">
          <Badge variant="outline" className="rounded-full">Tuân thủ cộng đồng</Badge>
          <h1 className="mt-4 text-4xl md:text-5xl font-display font-extrabold tracking-tight">
            Quy tắc ứng xử của RoomieMatch
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Cùng xây dựng không gian tìm bạn cùng phòng an toàn, tôn trọng và đáng tin cậy cho cộng đồng người dùng tại Việt Nam.
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
          <h2 className="text-2xl font-display font-bold">Báo cáo vi phạm</h2>
          <p className="mt-2 text-muted-foreground">
            Nếu bạn gặp hành vi không phù hợp, hãy báo cáo ngay trong ứng dụng hoặc liên hệ đội ngũ hỗ trợ. Chúng tôi sẽ xem xét và xử lý trong vòng 24-48 giờ.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/dashboard">
              <Button className="rounded-full bg-navy hover:bg-navy/90 text-white">Vào ứng dụng</Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="rounded-full">Về trang chủ</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
