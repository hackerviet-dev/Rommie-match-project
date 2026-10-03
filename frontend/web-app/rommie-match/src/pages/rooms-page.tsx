import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryState, Pagination } from "@/components/common/query-state";
import { roomsApi } from "@/features/rooms/services/rooms-api";
import { useAuthStore } from "@/features/auth";
export default function RoomsPage() {
  const [p, setP] = useSearchParams(),
    me = useAuthStore((s) => s.user?.id),
    page = Number(p.get("page")) || 1,
    filters = {
      page,
      city: p.get("city") ?? undefined,
      district: p.get("q") ?? undefined,
      maxRent: p.has("maxRent") ? Number(p.get("maxRent")) : undefined,
      availableBy: p.get("availableBy") ?? undefined,
    };
  const query = useQuery({
    queryKey: ["rooms", "list", me, filters],
    queryFn: () => roomsApi.search(filters),
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
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">
            Tìm căn phòng phù hợp
          </h1>
          <p className="mt-2 text-muted-foreground">
            Thông tin phòng do thành viên đăng, lọc theo khu vực và ngân sách.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/settings?section=rooms">Phòng của tôi</Link>
          </Button>
          <Button asChild>
            <Link to={me ? "/rooms/new" : "/login"}>Đăng phòng</Link>
          </Button>
        </div>
      </div>
      <Card className="mt-6 grid gap-4 rounded-2xl p-5 sm:grid-cols-4">
        <label className="text-sm">
          Thành phố
          <Input
            value={p.get("city") ?? ""}
            onChange={(e) => change("city", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Quận / khu vực
          <Input
            value={p.get("q") ?? ""}
            onChange={(e) => change("q", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Giá thuê tối đa (VND)
          <Input
            type="number"
            min={0}
            value={p.get("maxRent") ?? ""}
            onChange={(e) => change("maxRent", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Sẵn sàng trước
          <Input
            type="date"
            value={p.get("availableBy") ?? ""}
            onChange={(e) => change("availableBy", e.target.value)}
          />
        </label>
      </Card>
      <QueryState query={query} />
      {query.data && (
        <p className="mt-4 text-sm text-muted-foreground">
          {query.data.totalCount} phòng
        </p>
      )}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {query.data?.items.map((r) => (
          <Card key={r.id} className="rounded-3xl p-6">
            <div className="mb-4 rounded-2xl bg-mint/20 p-6 text-xl text-navy">
              {r.propertyType || "Phòng ở ghép"}
            </div>
            <h2 className="text-xl font-semibold">{r.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {r.district}, {r.city}
            </p>
            <p className="mt-4 text-xl font-semibold text-teal">
              {r.monthlyRent.toLocaleString("vi-VN")}₫ / tháng
            </p>
            <p className="mt-2 text-sm">Có thể dọn vào: {r.availableFrom}</p>
            <Button asChild className="mt-5 w-full">
              <Link to={`/rooms/${r.id}`}>Xem phòng</Link>
            </Button>
          </Card>
        ))}
      </div>
      {query.data?.totalCount === 0 && (
        <p role="status" className="py-12 text-center text-muted-foreground">
          Chưa có phòng phù hợp với bộ lọc.
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
