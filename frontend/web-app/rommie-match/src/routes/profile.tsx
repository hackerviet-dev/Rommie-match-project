import { Link, useParams } from "react-router-dom";
import { AppShell, CompatRing } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { roommates } from "@/lib/mock-data";
import { MessageCircle, Bookmark, Flag, MapPin, Calendar, Briefcase, Wallet } from "lucide-react";

export default function Profile() {
  const { id } = useParams();
  const r = roommates.find((x) => x.id === id) ?? roommates[0];

  return (
    <AppShell>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-0 shadow-sm overflow-hidden lg:sticky lg:top-24 self-start">
          <div className="h-32 gradient-brand" />
          <div className="px-6 pb-6 -mt-12">
            <img src={r.avatar} className="h-28 w-28 rounded-3xl ring-4 ring-card bg-mint/30" />
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <div className="font-display font-bold text-2xl">{r.name}</div>
                <div className="text-sm text-muted-foreground">
                  {r.age} · {r.occupation}
                </div>
              </div>
              <CompatRing score={r.score} size={64} />
            </div>

            <div className="mt-5 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" /> {r.city}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" /> {r.occupation}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="h-4 w-4" /> {r.budget} / tháng
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" /> Dọn vào {r.moveIn}
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Link to="/chat">
                <Button className="w-full rounded-xl bg-navy hover:bg-navy/90 text-white">
                  <MessageCircle className="h-4 w-4 mr-2" /> Nhắn tin
                </Button>
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="rounded-xl">
                  <Bookmark className="h-4 w-4 mr-2" /> Lưu
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
                >
                  <Flag className="h-4 w-4 mr-2" /> Báo cáo
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 rounded-3xl border-0 shadow-sm">
            <h3 className="font-display font-bold text-lg">Phân tích độ hợp nhau</h3>
            <p className="text-sm text-muted-foreground">
              Dựa trên trắc nghiệm và sở thích lối sống của bạn.
            </p>
            <div className="mt-5 space-y-4">
              {r.breakdown.map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">{b.label}</span>
                    <span className="font-bold text-navy">{b.value}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full gradient-brand rounded-full"
                      style={{ width: `${b.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 rounded-3xl border-0 shadow-sm">
            <h3 className="font-display font-bold text-lg">Giới thiệu</h3>
            <p className="mt-3 text-foreground/90 leading-relaxed">{r.bio}</p>
          </Card>

          <Card className="p-6 rounded-3xl border-0 shadow-sm">
            <h3 className="font-display font-bold text-lg">Sở thích & đam mê</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {r.interests.map((i) => (
                <Badge
                  key={i}
                  className="rounded-full bg-mint/30 text-navy border-0 hover:bg-mint/40 px-3 py-1.5"
                >
                  {i}
                </Badge>
              ))}
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="p-6 rounded-3xl border-0 shadow-sm">
              <h3 className="font-display font-bold text-lg">Mong muốn nơi ở</h3>
              <ul className="mt-3 text-sm space-y-2 text-muted-foreground">
                <li>· Tìm: phòng riêng hoặc 2PN chung</li>
                <li>· Cách trung tâm: dưới 5 km</li>
                <li>· Hợp đồng: 12 tháng trở lên</li>
                <li>· Không hút thuốc trong nhà</li>
              </ul>
            </Card>
            <Card className="p-6 rounded-3xl border-0 shadow-sm">
              <h3 className="font-display font-bold text-lg">Mức độ hoạt động</h3>
              <div className="mt-3 text-sm text-muted-foreground">Hoạt động trong 24h qua</div>
              <div className="mt-2 text-sm">
                Thường trả lời trong{" "}
                <span className="font-semibold text-foreground">dưới 1 giờ</span>
              </div>
              <div className="mt-4 flex gap-1.5">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-6 flex-1 rounded ${[2, 3, 5, 6, 8, 9, 10, 12, 13].includes(i) ? "bg-teal" : "bg-muted"}`}
                  />
                ))}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Hoạt động 2 tuần qua</div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
