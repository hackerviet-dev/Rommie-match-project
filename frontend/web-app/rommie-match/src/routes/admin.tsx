import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, Heart, DollarSign, TrendingUp, MapPin } from "lucide-react";

function Spark({ data, color = "#15A9B8" }: { data: number[]; color?: string }) {
  const max = Math.max(...data),
    min = Math.min(...data);
  const w = 240,
    h = 70,
    step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / (max - min || 1)) * h}`).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
      <defs>
        <linearGradient id="a" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#a)" />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Admin() {
  const cities = [
    { name: "TP. Hồ Chí Minh", users: 7842, pct: 100 },
    { name: "Hà Nội", users: 3210, pct: 41 },
    { name: "Đà Nẵng", users: 1156, pct: 15 },
    { name: "Cần Thơ", users: 432, pct: 6 },
    { name: "Hải Phòng", users: 287, pct: 4 },
  ];
  const stats = [
    {
      i: Users,
      label: "Tổng người dùng",
      value: "12.927",
      change: "+8,4%",
      color: "from-teal/20 to-teal/5",
    },
    {
      i: Crown,
      label: "Người dùng Premium",
      value: "1.842",
      change: "+12,1%",
      color: "from-amber-200/40 to-amber-100/10",
    },
    {
      i: Heart,
      label: "Ghép đôi thành công",
      value: "3.408",
      change: "+5,7%",
      color: "from-mint/40 to-mint/10",
    },
    {
      i: DollarSign,
      label: "Doanh thu tháng",
      value: "36,8 triệu ₫",
      change: "+14,2%",
      color: "from-navy/15 to-navy/5",
    },
  ];

  return (
    <AppShell>
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Tổng quan quản trị</h1>
          <p className="text-muted-foreground mt-1">RoomieMatch · 30 ngày qua</p>
        </div>
        <Badge className="rounded-full bg-mint/40 text-navy border-0 px-3 py-1.5">
          Quản trị · Trực tiếp
        </Badge>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className={`p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br ${s.color}`}
          >
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-white/70 grid place-items-center text-navy">
                <s.i className="h-5 w-5" />
              </div>
              <Badge className="bg-mint/60 text-navy border-0 rounded-full text-[10px]">
                <TrendingUp className="h-3 w-3 mr-1" />
                {s.change}
              </Badge>
            </div>
            <div className="mt-4 text-3xl font-display font-bold">{s.value}</div>
            <div className="text-sm font-medium mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-5">
        <Card className="p-6 rounded-2xl border-0 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-display font-bold">Tăng trưởng người dùng</div>
              <div className="text-xs text-muted-foreground">Đăng ký mỗi ngày · 30 ngày qua</div>
            </div>
            <Badge variant="outline" className="rounded-full">
              +8,4%
            </Badge>
          </div>
          <Spark
            data={[
              12, 18, 15, 22, 28, 24, 30, 35, 29, 38, 42, 40, 48, 52, 49, 55, 60, 58, 65, 71, 68,
              74, 80, 77, 84, 90, 86, 93, 98, 104,
            ]}
          />
          <div className="grid grid-cols-3 gap-4 mt-3 text-center text-xs">
            <div>
              <div className="font-bold text-lg">3.492</div>
              <div className="text-muted-foreground">Người dùng mới</div>
            </div>
            <div>
              <div className="font-bold text-lg">68%</div>
              <div className="text-muted-foreground">Hoàn thành trắc nghiệm</div>
            </div>
            <div>
              <div className="font-bold text-lg">2,4 phút</div>
              <div className="text-muted-foreground">Thời gian ghép TB</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-sm">
          <div className="font-display font-bold">Doanh thu (triệu ₫)</div>
          <div className="text-xs text-muted-foreground">Hàng tháng · từ đầu năm</div>
          <Spark data={[12, 14, 16, 18, 22, 25, 28, 30, 34, 36]} color="#0B3B6E" />
          <div className="text-2xl font-display font-bold mt-2">36,8 triệu ₫</div>
          <div className="text-xs text-mint">↑ 14,2% so với tháng trước</div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-sm lg:col-span-2">
          <div className="font-display font-bold mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Thành phố phổ biến
          </div>
          <div className="space-y-4">
            {cities.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">
                    {c.users.toLocaleString("vi-VN")} người dùng
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full gradient-brand rounded-full"
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-sm">
          <div className="font-display font-bold mb-4">Tỷ lệ ghép thành công</div>
          <div className="relative h-40 grid place-items-center">
            <svg viewBox="0 0 100 100" className="w-40 h-40 -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#15A9B8"
                strokeWidth="10"
                fill="none"
                strokeDasharray={251}
                strokeDashoffset={251 * 0.26}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-3xl font-display font-bold">74%</div>
                <div className="text-xs text-muted-foreground">tỷ lệ thành công</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
