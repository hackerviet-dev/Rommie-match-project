import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { services as seed } from "@/lib/mock-data";
import { Star, MapPin, Phone, Calendar, Droplet, Shirt, Sparkles, Wrench, Zap, Wifi } from "lucide-react";

const catIcons: Record<string, typeof Star> = {
  "Giao nước": Droplet,
  "Giặt ủi": Shirt,
  "Dọn dẹp": Sparkles,
  "Sửa điện": Zap,
  "Sửa ống nước": Wrench,
  "Lắp internet": Wifi,
};
const CATS = ["Tất cả", ...Object.keys(catIcons)];


export default function Services() {
  const [list] = useState(seed);
  const [cat, setCat] = useState("Tất cả");

  const filtered = cat === "Tất cả" ? list : list.filter(s => s.category === cat);

  return (
    <AppShell>
      <div>
        <h1 className="text-3xl font-display font-bold">Dịch vụ gần nhà</h1>
        <p className="text-muted-foreground mt-1">Các dịch vụ địa phương đáng tin cậy, hỗ trợ bạn ổn định cuộc sống.</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {CATS.map(c => {
          const active = c === cat;
          return (
            <button key={c} onClick={()=>setCat(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${active ? "bg-navy text-white border-navy" : "bg-card text-foreground border-border hover:bg-muted"}`}>
              {c}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(s => {
          const Icon = catIcons[s.category];
          return (
            <Card key={s.name} className="p-6 rounded-3xl border-0 shadow-sm hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-mint/30 grid place-items-center text-2xl text-navy">
                  {Icon ? <Icon className="h-6 w-6" /> : s.img}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.category}</div>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-amber-500"><Star className="h-3 w-3 fill-current" /> {s.rating}</span>
                    <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" /> {s.distance}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 px-3 py-2 rounded-xl bg-muted/60 text-xs flex justify-between">
                <span className="text-muted-foreground">Giá từ</span>
                <span className="font-semibold">{s.price}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" className="rounded-xl"><Phone className="h-4 w-4 mr-1.5" /> Gọi</Button>
                <Button className="rounded-xl bg-teal hover:bg-teal/90 text-white"><Calendar className="h-4 w-4 mr-1.5" /> Đặt</Button>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-12">Chưa có dịch vụ trong danh mục này.</div>
        )}
      </div>
    </AppShell>
  );
}
