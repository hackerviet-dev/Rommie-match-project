import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getSaved, toggleSaved } from "@/lib/saved-profiles";
import { toast } from "sonner";
import * as m from "motion/react-m";
import { AppShell, CompatRing } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { roommates } from "@/lib/mock-data";
import { MessageCircle, Bookmark, SlidersHorizontal, Search } from "lucide-react";

export default function Matches() {
  const [savedIds, setSavedIds] = useState(getSaved);
  useEffect(() => {
    const sync = () => setSavedIds(getSaved());
    window.addEventListener("saved-profiles-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("saved-profiles-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = (id: string) => {
    try { toggleSaved(id); }
    catch { toast.error("Không thể lưu hồ sơ trên trình duyệt này."); }
  };
  return (
    <AppShell>
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Kết quả ghép đôi</h1>
          <p className="text-muted-foreground mt-1">
            {roommates.length} bạn cùng phòng phù hợp, xếp theo điểm AI.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc sở thích..."
              className="pl-9 h-10 rounded-xl w-64"
            />
          </div>
          <Button variant="outline" className="rounded-xl">
            <SlidersHorizontal className="h-4 w-4 mr-2" /> Bộ lọc
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[
          "Tất cả",
          "≥ 90% hợp",
          "Cùng thành phố",
          "Yêu thú cưng",
          "Không hút thuốc",
          "Dọn vào tháng này",
        ].map((t, i) => (
          <Badge
            key={t}
            variant={i === 0 ? "default" : "outline"}
            className={`rounded-full px-4 py-1.5 cursor-pointer ${i === 0 ? "bg-navy text-white" : ""}`}
          >
            {t}
          </Badge>
        ))}
      </div>

      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {roommates.map((r, index) => (
          <m.div
            key={r.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            whileHover={{ y: -6, scale: 1.01 }}
          >
            <Card className="h-full rounded-3xl border-0 shadow-sm overflow-hidden hover:shadow-xl transition-shadow">
              <div className="relative h-32 gradient-brand">
                <div className="absolute -bottom-10 left-5">
                  <img
                    src={r.avatar}
                    className="h-20 w-20 rounded-2xl ring-4 ring-card bg-mint/30"
                  />
                </div>
                <div className="absolute top-3 right-3">
                  <CompatRing score={r.score} size={56} />
                </div>
              </div>
              <div className="p-5 pt-12">
                <div className="font-display font-bold text-lg">
                  {r.name}, {r.age}
                </div>
                <div className="text-sm text-muted-foreground">
                  {r.occupation} · {r.city}
                </div>

                <div className="mt-4 space-y-2">
                  {r.breakdown.slice(0, 3).map((b) => (
                    <div key={b.label}>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{b.label}</span>
                        <span className="font-semibold">{b.value}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full gradient-brand" style={{ width: `${b.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex gap-2">
                  <Link to={`/profile/${r.id}`} className="flex-1">
                    <Button variant="outline" className="w-full rounded-xl">
                      Xem hồ sơ
                    </Button>
                  </Link>
                  <Link to="/chat">
                    <Button size="icon" className="rounded-xl bg-teal hover:bg-teal/90 text-white">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button size="icon" variant="outline" className="rounded-xl" aria-label={`${savedIds.includes(r.id) ? "Bỏ lưu" : "Lưu"} ${r.name}`} aria-pressed={savedIds.includes(r.id)} onClick={() => save(r.id)}>
                    <Bookmark className={`h-4 w-4 ${savedIds.includes(r.id) ? "fill-teal text-teal" : ""}`} />
                  </Button>
                </div>
              </div>
            </Card>
          </m.div>
        ))}
      </div>
    </AppShell>
  );
}
