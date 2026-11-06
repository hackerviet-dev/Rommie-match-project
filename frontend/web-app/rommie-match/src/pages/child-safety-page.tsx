import { Link } from "react-router-dom";
import { Logo } from "@/layouts/main-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Ban, Check, Flag, Mail, ShieldAlert, UserX } from "lucide-react";

const LAST_UPDATED = "06/11/2026";
const CONTACT_EMAIL = "kietnhase180372@fpt.edu.vn";

function PublicNav() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-border/50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Trang chủ</Link>
          <Link to="/community-guidelines" className="hover:text-foreground">Quy tắc cộng đồng</Link>
          <Link to="/privacy" className="hover:text-foreground">Chính sách bảo mật</Link>
          <Link to="/child-safety" className="text-navy font-semibold">An toàn trẻ em</Link>
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
    icon: ShieldAlert,
    title: "Không khoan nhượng với lạm dụng và bóc lột tình dục trẻ em (CSAE)",
    body: "RoomieMatch nghiêm cấm mọi nội dung và hành vi liên quan đến lạm dụng, bóc lột tình dục trẻ em, bao gồm tài liệu lạm dụng tình dục trẻ em (CSAM).",
    bullets: [
      "Cấm đăng, gửi, lưu trữ hoặc chia sẻ hình ảnh, tin nhắn hoặc nội dung nào khai thác, tình dục hóa hay gây nguy hại cho người dưới 18 tuổi.",
      "Cấm dụ dỗ, tiếp cận hoặc liên hệ với trẻ em vì mục đích tình dục hoặc bóc lột.",
      "Cấm sử dụng hồ sơ, tin đăng phòng, tin nhắn hoặc dịch vụ để giả mạo tuổi hoặc thu hút người chưa đủ tuổi.",
    ],
  },
  {
    icon: UserX,
    title: "Ứng dụng chỉ dành cho người từ 18 tuổi trở lên",
    body: "RoomieMatch kết nối người trưởng thành tìm bạn cùng phòng, không hướng tới trẻ em.",
    bullets: [
      "Khi hoàn thiện hồ sơ, người dùng phải khai tuổi từ 18 trở lên mới tiếp tục sử dụng.",
      "Trên Google Play, ứng dụng được khai báo với đối tượng mục tiêu là người từ 18 tuổi trở lên.",
      "Nếu chúng tôi phát hiện người dùng chưa đủ 18 tuổi, tài khoản sẽ bị khóa và dữ liệu được xử lý theo chính sách bảo mật.",
    ],
  },
  {
    icon: Flag,
    title: "Báo cáo vi phạm ngay trong ứng dụng",
    body: "Mọi người dùng có thể báo cáo và chặn tài khoản hoặc tin đăng đáng ngờ.",
    bullets: [
      "Nút “Báo cáo” và “Chặn” có trên hồ sơ của từng thành viên; tin đăng phòng cũng có thể được báo cáo.",
      "Báo cáo được gửi tới đội ngũ quản trị và kiểm duyệt để xem xét.",
      "Người dùng có thể gửi góp ý trực tiếp qua mục Góp ý trong ứng dụng.",
      "Bạn cũng có thể gửi báo cáo về an toàn trẻ em qua email ở cuối trang này.",
    ],
  },
  {
    icon: Ban,
    title: "Cách chúng tôi xử lý",
    body: "Báo cáo liên quan đến an toàn trẻ em được ưu tiên xử lý trước các báo cáo khác.",
    bullets: [
      "Gỡ hoặc ẩn nội dung, tin đăng vi phạm.",
      "Khóa vĩnh viễn tài khoản vi phạm và chặn tiếp tục sử dụng dịch vụ.",
      "Lưu giữ thông tin cần thiết và báo cáo cho cơ quan chức năng có thẩm quyền theo quy định pháp luật Việt Nam khi phát hiện hoặc nghi ngờ có CSAM hoặc hành vi bóc lột trẻ em.",
      "Phối hợp với cơ quan chức năng và với Google khi được yêu cầu.",
    ],
  },
];

export default function ChildSafetyPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-16">
        <div className="text-center">
          <Badge variant="outline" className="rounded-full">Cập nhật ngày {LAST_UPDATED}</Badge>
          <h1 className="mt-4 text-4xl md:text-5xl font-display font-extrabold tracking-tight">
            Tiêu chuẩn an toàn trẻ em
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Tiêu chuẩn công khai của RoomieMatch nhằm ngăn chặn lạm dụng và bóc lột tình dục trẻ em (CSAE), áp dụng cho trang web và ứng dụng di động.
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

        <Card className="p-6 md:p-8 rounded-2xl border-0 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-mint/40 grid place-items-center text-navy">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Liên hệ về an toàn trẻ em</h2>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Nếu bạn phát hiện nội dung hoặc hành vi liên quan đến lạm dụng, bóc lột trẻ em, hãy báo cho chúng tôi. Người phụ trách an toàn trẻ em của RoomieMatch được chỉ định để nhận và xử lý báo cáo.
              </p>
              <p className="mt-3 text-sm">
                Email:{" "}
                <a className="font-semibold text-navy underline" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </div>
        </Card>

        <div className="mt-12 text-sm text-muted-foreground max-w-2xl mx-auto space-y-3">
          <h2 className="text-lg font-display font-bold text-foreground">Summary (English)</h2>
          <p>
            RoomieMatch is a roommate-matching app for adults aged 18 and over. We prohibit child sexual abuse and
            exploitation (CSAE), including child sexual abuse material (CSAM). Users can report and block members and
            report listings inside the app; reports are reviewed by our moderation team, violating content is removed,
            offending accounts are locked, and suspected CSAM or child exploitation is reported to the competent
            authorities as required by law.
          </p>
          <p>
            Child safety contact:{" "}
            <a className="font-semibold text-navy underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/community-guidelines">
            <Button variant="outline" className="rounded-full">Quy tắc cộng đồng</Button>
          </Link>
          <Link to="/">
            <Button className="rounded-full bg-navy hover:bg-navy/90 text-white">Về trang chủ</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
