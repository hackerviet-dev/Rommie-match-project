import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryState, Pagination } from "@/components/common/query-state";
import { hyperlocalApi } from "@/features/hyperlocal";
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
      <QueryState query={query} />
      {query.data && (
        <p className="mt-4 text-sm text-muted-foreground">
          {query.data.totalCount} dịch vụ
        </p>
      )}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {query.data?.items.map((s) => (
          <Card key={s.id} className="rounded-3xl p-6">
            <p className="text-xs text-teal">
              {s.category}
              {s.isVerified ? " · Đã xác minh" : ""}
            </p>
            <h2 className="mt-2 text-xl font-semibold">{s.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {s.district}, {s.city}
            </p>
            <p className="mt-3 text-sm">{s.description}</p>
            <p className="mt-4 font-semibold">
              Từ {s.priceFrom.toLocaleString("vi-VN")}₫
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {s.rating}/5 · {s.reviewCount} đánh giá
            </p>
            <div className="mt-5 flex gap-3">
              <Button asChild className="flex-1">
                <Link to={`/services/${s.id}`}>Chi tiết / Đặt lịch</Link>
              </Button>
              {s.phone && (
                <Button variant="outline" asChild>
                  <a href={`tel:${s.phone}`}>Gọi</a>
                </Button>
              )}
            </div>
          </Card>
        ))}
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
