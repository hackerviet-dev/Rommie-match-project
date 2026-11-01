import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, Smartphone, Monitor, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { Logo } from "@/layouts/main-layout";

// Public page linked from Google Play's "Data deletion" section; it must work signed out.
const STEPS = [
  {
    icon: Smartphone,
    title: "Trong ứng dụng RoomieMatch",
    steps: [
      "Đăng nhập, mở Tài khoản → Cài đặt & bảo mật.",
      "Kéo xuống mục Xóa tài khoản.",
      "Nhập lại email, nhập mật khẩu (bỏ trống nếu bạn đăng nhập bằng Google) rồi xác nhận.",
    ],
  },
  {
    icon: Monitor,
    title: "Trên trang web",
    steps: [
      "Đăng nhập tại RoomieMatch trên trình duyệt.",
      "Mở Cài đặt & bảo mật, mục Xóa tài khoản.",
      "Nhập lại email, mật khẩu nếu có rồi xác nhận.",
    ],
  },
];

const DELETED = [
  "Tài khoản đăng nhập và hồ sơ cá nhân, ảnh đại diện.",
  "Sở thích lối sống, kết quả trắc nghiệm và điểm ghép đôi.",
  "Tin phòng đã đăng, hồ sơ đã lưu, danh sách chặn.",
  "Tin nhắn bạn đã gửi, yêu cầu ghép đôi, thông báo.",
  "Gói Premium, lịch sử thanh toán và yêu cầu hoàn tiền.",
  "Hồ sơ xác minh danh tính, đặt lịch dịch vụ, nhóm ở ghép và tranh chấp.",
];

const KEPT = [
  "Góp ý sản phẩm bạn đã gửi được giữ lại nhưng bỏ liên kết với tài khoản.",
  "Nhật ký quản trị chỉ giữ mã tài khoản đã xóa, không giữ email hay hồ sơ.",
];

export default function DeleteAccountPage() {
  const [params] = useSearchParams();
  const isJustDeleted = params.get("deleted") === "1";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Button asChild variant="ghost" className="rounded-full">
            <Link to={ROUTES.login}>Đăng nhập</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
        {isJustDeleted && (
          <Card
            role="status"
            className="mb-8 flex items-start gap-3 rounded-2xl border-0 bg-mint/30 p-5 shadow-none"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
            <p className="text-sm">
              Tài khoản của bạn đã được xóa và đăng xuất khỏi mọi thiết bị. Dữ liệu sẽ bị xóa vĩnh
              viễn sau 30 ngày.
            </p>
          </Card>
        )}

        <Badge variant="outline" className="rounded-full">
          Quyền riêng tư
        </Badge>
        <h1 className="mt-4 text-3xl md:text-4xl font-display font-extrabold tracking-tight">
          Xóa tài khoản RoomieMatch
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Bạn có thể tự xóa tài khoản RoomieMatch bất kỳ lúc nào, trong ứng dụng hoặc trên web.
          Không cần liên hệ hay chờ duyệt.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {STEPS.map((item) => (
            <Card key={item.title} className="rounded-2xl border-0 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-mint/40 text-navy">
                  <item.icon className="h-5 w-5" />
                </div>
                <h2 className="font-bold">{item.title}</h2>
              </div>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                {item.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </Card>
          ))}
        </div>

        <Card className="mt-5 rounded-2xl border-0 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-mint/40 text-navy">
              <Clock className="h-5 w-5" />
            </div>
            <h2 className="font-bold">Điều gì xảy ra sau khi xóa</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Ngay lập tức:</strong> bạn bị đăng xuất khỏi mọi
              thiết bị, không đăng nhập lại được; hồ sơ và tin phòng không còn hiện với người khác.
            </li>
            <li>
              <strong className="text-foreground">Sau 30 ngày:</strong> tài khoản và dữ liệu bên
              dưới bị xóa vĩnh viễn khỏi hệ thống. Trong 30 ngày này đội ngũ hỗ trợ có thể khôi phục
              nếu bạn đổi ý.
            </li>
          </ul>
        </Card>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Card className="rounded-2xl border-0 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
                <Trash2 className="h-5 w-5" />
              </div>
              <h2 className="font-bold">Dữ liệu bị xóa</h2>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {DELETED.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Card>
          <Card className="rounded-2xl border-0 p-6 shadow-sm">
            <h2 className="font-bold">Dữ liệu được giữ lại</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {KEPT.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-navy hover:bg-navy/90 text-white">
            <Link to={`${ROUTES.settings}?section=settings`}>Đến Cài đặt & bảo mật</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to={ROUTES.landing}>Về trang chủ</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
