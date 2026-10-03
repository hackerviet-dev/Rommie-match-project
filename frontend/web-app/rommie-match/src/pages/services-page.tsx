import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryState, Pagination } from "@/components/common/query-state";
import { hyperlocalApi } from "@/features/hyperlocal";
import {
  Star,
  MapPin,
  Phone,
  Calendar,
  Droplet,
  Shirt,
  Sparkles,
  Wrench,
  Zap,
  Wifi,
  Store,
} from "lucide-react";
const categoryIcons = {
  "Giao nước": Droplet,
  "Giặt ủi": Shirt,
  "Dọn dẹp": Sparkles,
  "Sửa điện": Zap,
  "Sửa ống nước": Wrench,
  "Lắp internet": Wifi,
};
export default function ServicesPage() {
  const [p, setP] = useSearchParams(),
    page = Number(p.get("page")) || 1,
    city = p.get("city") ?? "TP.HCM",
    district = p.get("district") ?? "",
    category = p.get("category") ?? "",
    search = p.get("q") ?? "";
  const query = useQuery({
    queryKey: ["services", city, district, category, page, search],
    queryFn: () => hyperlocalApi.list(city, district, category, page, search),
  });
  const change = (key: string, value: string) =>
    setP(
      (old) => {
        const n = new URLSearchParams(old);
        if (value) n.set(key, value);
        else n.delete(key);
        if (key !== "page") n.delete("page");
        return n;
      },
      { replace: true },
    );
  return (
    <AppShell>
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Dịch vụ gần nhà</h1>
          <p className="mt-2 text-muted-foreground">
            Tìm nhà cung cấp và đặt lịch phù hợp với bạn.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/settings?section=bookings">Lịch đặt của tôi</Link>
        </Button>
      </div>
      <Card className="mt-6 grid gap-4 rounded-2xl p-5 sm:grid-cols-4">
        {[
          ["q", "Tên hoặc danh mục"],
          ["city", "Thành phố"],
          ["district", "Quận / khu vực"],
          ["category", "Danh mục dịch vụ"],
        ].map(([k, l]) => (
          <label key={k} className="text-sm">
            {l}
            <Input
              value={p.get(k) ?? (k === "city" ? "TP.HCM" : "")}
              onChange={(e) => change(k, e.target.value)}
              placeholder={k === "category" ? "Ví dụ: Giặt ủi" : ""}
            />
          </label>
        ))}
      </Card>
      <div className="mt-6 flex flex-wrap gap-2">
        {["", ...Object.keys(categoryIcons)].map((c) => (
          <button
            key={c}
            aria-pressed={category === c}
            onClick={() => change("category", c)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${category === c ? "border-navy bg-navy text-white" : "border-border bg-card hover:bg-muted"}`}
          >
            {c || "Tất cả"}
          </button>
        ))}
      </div>
      <QueryState query={query} />
      {query.data && (
        <p className="mt-4 text-sm text-muted-foreground">
          {query.data.totalCount} dịch vụ
        </p>
      )}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {query.data?.items.map((s) => {
          const Icon =
            categoryIcons[s.category as keyof typeof categoryIcons] ?? Store;
          return (
            <Card
              key={s.id}
              className="rounded-3xl border-0 p-6 shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-mint/30 text-navy">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display font-bold">{s.name}</h2>
                  <p className="mt-1 text-xs text-teal">
                    {s.category}
                    {s.isVerified ? " · Đã xác minh" : ""}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {s.district}, {s.city}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                    <Star className="h-3 w-3 fill-current" />
                    {s.rating}/5 · {s.reviewCount} đánh giá
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm">{s.description}</p>
              <p className="mt-4 flex justify-between rounded-xl bg-muted/60 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Giá từ</span>
                <span className="font-semibold">
                  {s.priceFrom.toLocaleString("vi-VN")}₫
                </span>
              </p>
              <div className="mt-5 flex gap-3">
                <Button
                  asChild
                  className="flex-1 bg-teal text-white hover:bg-teal/90"
                >
                  <Link to={`/services/${s.id}`}>
                    <Calendar className="h-4 w-4" /> Đặt lịch
                  </Link>
                </Button>
                {s.phone && (
                  <Button variant="outline" asChild>
                    <a href={`tel:${s.phone}`}>
                      <Phone className="h-4 w-4" />
                      Gọi
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {query.data?.totalCount === 0 && (
        <p role="status" className="py-12 text-center text-muted-foreground">
          Chưa có dịch vụ phù hợp.
        </p>
      )}
      {query.data && (
        <Pagination
          page={page}
          hasNext={query.data.hasNextPage}
          onChange={(n) => change("page", String(n))}
        />
      )}
    </AppShell>
  );
}
