import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles, Zap, Eye, Filter, TrendingUp } from "lucide-react";

const features = [
  { name: "Ghép đôi cơ bản", free: true, pro: true },
  { name: "Trò chuyện trong ứng dụng", free: true, pro: true },
  { name: "Xác minh hồ sơ", free: true, pro: true },
  { name: "Phân tích hợp nhau nâng cao", free: false, pro: true },
  { name: "Quét hợp nhau không giới hạn", free: false, pro: true },
  { name: "Bộ lọc nâng cao", free: false, pro: true },
  { name: "Hiển thị ưu tiên", free: false, pro: true },
  { name: "Boost hồ sơ (xem nhiều hơn 5 lần)", free: false, pro: true },
  { name: "Xem ai đã xem bạn", free: false, pro: true },
];

export default function Premium() {
  return (
    <AppShell>
      <div className="text-center max-w-2xl mx-auto">
        <Badge className="rounded-full bg-mint/40 text-navy border-0 px-3 py-1">
          <Sparkles className="h-3 w-3 mr-1.5" /> Premium
        </Badge>
        <h1 className="mt-4 text-4xl sm:text-5xl font-display font-extrabold">
          Ghép thông minh. <span className="text-gradient-brand">Dọn vào nhanh.</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Mở khoá bộ lọc nâng cao, hiển thị ưu tiên và phân tích AI.
        </p>
      </div>

      <div className="mt-10 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card className="p-8 rounded-3xl border-0 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">Miễn phí</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-display font-extrabold">0₫</span>
            <span className="text-muted-foreground">/mãi mãi</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Mọi thứ để bắt đầu hành trình.</p>
          <Button variant="outline" className="w-full mt-6 rounded-xl">
            Gói hiện tại
          </Button>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Ghép đôi cơ bản",
              "Trò chuyện trong ứng dụng",
              "5 lượt quét/tháng",
              "Bộ lọc tiêu chuẩn",
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="h-4 w-4 text-mint mt-0.5" /> {f}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-8 rounded-3xl border-0 shadow-xl gradient-brand text-white relative overflow-hidden">
          <div className="absolute top-4 right-4">
            <Badge className="bg-white/20 text-white border-0 rounded-full">Phổ biến nhất</Badge>
          </div>
          <div className="text-sm font-medium text-white/80">Premium</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-display font-extrabold">20.000₫</span>
            <span className="text-white/80">/tháng</span>
          </div>
          <p className="mt-2 text-sm text-white/80">Huỷ bất cứ lúc nào.</p>
          <Button className="w-full mt-6 rounded-xl bg-white text-navy hover:bg-white/90 font-semibold">
            Nâng cấp ngay
          </Button>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              { i: Sparkles, t: "Phân tích hợp nhau nâng cao" },
              { i: Zap, t: "Quét hợp nhau không giới hạn" },
              { i: Filter, t: "Bộ lọc nâng cao" },
              { i: Eye, t: "Xem ai đã xem bạn" },
              { i: TrendingUp, t: "Boost hồ sơ — xem gấp 5 lần" },
            ].map((f, i) => (
              <li key={i} className="flex gap-2">
                <f.i className="h-4 w-4 mt-0.5" /> {f.t}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-12 max-w-3xl mx-auto">
        <h2 className="text-2xl font-display font-bold text-center">So sánh các gói</h2>
        <Card className="mt-6 rounded-3xl border-0 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-4 font-semibold">Tính năng</th>
                <th className="p-4 font-semibold text-center">Miễn phí</th>
                <th className="p-4 font-semibold text-center text-teal">Premium</th>
              </tr>
            </thead>
            <tbody>
              {features.map((f, i) => (
                <tr key={f.name} className={i % 2 ? "bg-muted/20" : ""}>
                  <td className="p-4">{f.name}</td>
                  <td className="p-4 text-center">
                    {f.free ? (
                      <Check className="h-4 w-4 text-mint mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {f.pro ? (
                      <Check className="h-4 w-4 text-teal mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="mt-10 text-center">
          <Button
            size="lg"
            className="rounded-full bg-navy hover:bg-navy/90 text-white px-10 h-14 text-base"
          >
            Nâng cấp Premium — 20.000₫/tháng
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Thanh toán an toàn · Huỷ bất cứ lúc nào · Hoàn tiền trong 7 ngày
          </p>
        </div>
      </div>
    </AppShell>
  );
}
