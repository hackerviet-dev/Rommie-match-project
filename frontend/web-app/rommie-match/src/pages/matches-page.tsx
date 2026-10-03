import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bookmark,
  MapPin,
  MessageCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { chatApi } from "@/features/chat/services/chat-api";
import { toast } from "sonner";
import { AppShell, CompatRing } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryState, Pagination } from "@/components/common/query-state";
import { matchingApi } from "@/features/matching";
import { MatchingRefresh } from "@/features/matching/components/matching-refresh";
import { useSavedProfiles } from "@/features/profile/hooks/use-saved-profiles";
import { useAuthStore } from "@/features/auth";
export default function MatchesPage() {
  const [params, setParams] = useSearchParams(),
    [advanced, setAdvanced] = useState(false),
    [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const startChat = useMutation({
    mutationFn: chatApi.start,
    onSuccess: (c) => navigate(`/chat?conversation=${c.id}`),
    onError: (e) => toast.error(e.message),
  });
  const userId = useAuthStore((s) => s.user?.id),
    saved = useSavedProfiles();
  const page = Number(params.get("page")) || 1;
  const filters = {
    page,
    city: params.get("city") ?? undefined,
    q: params.get("q") ?? undefined,
    minScore: params.has("minScore")
      ? Number(params.get("minScore"))
      : undefined,
    sameCity: params.get("sameCity") === "true",
    petFriendly: params.get("petFriendly") === "true",
    nonSmoking: params.get("nonSmoking") === "true",
    district: params.get("district") ?? undefined,
    budgetMin: params.has("budgetMin")
      ? Number(params.get("budgetMin"))
      : undefined,
    budgetMax: params.has("budgetMax")
      ? Number(params.get("budgetMax"))
      : undefined,
    minCleanliness: params.has("minCleanliness")
      ? Number(params.get("minCleanliness"))
      : undefined,
    roomEnvironment: params.get("roomEnvironment") ?? undefined,
    verifiedOnly: params.get("verifiedOnly") === "true",
    moveInBy: params.get("moveInBy") ?? undefined,
  };
  const query = useQuery({
    queryKey: ["matching", "list", userId, filters],
    queryFn: () => matchingApi.list(filters),
  });
  const change = (key: string, value: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== "page") next.delete("page");
        return next;
      },
      { replace: true },
    );
  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">
            Người ở ghép phù hợp
          </h1>
          <p className="mt-2 text-muted-foreground">
            {query.data
              ? `${query.data.totalCount} hồ sơ từ kết quả ghép đôi đã lưu.`
              : "Khám phá người có lối sống phù hợp với bạn."}
          </p>
        </div>
        <Link to="/settings?section=saved">
          <Button variant="outline">Hồ sơ đã lưu</Button>
        </Link>
      </div>
      <div className="my-6">
        <MatchingRefresh />
      </div>
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Tìm người ở ghép"
            maxLength={60}
            placeholder="Tên hoặc sở thích…"
            value={params.get("q") ?? ""}
            onChange={(e) => change("q", e.target.value)}
            className="bg-white pl-11"
          />
        </div>
        <Button
          variant="outline"
          aria-expanded={showFilters}
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" /> Bộ lọc
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["minScore", "≥90% phù hợp", "90"],
          ["sameCity", "Cùng thành phố", "true"],
          ["petFriendly", "Yêu thú cưng", "true"],
          ["nonSmoking", "Không hút thuốc", "true"],
        ].map(([key, label, value]) => (
          <button
            key={key}
            aria-pressed={params.get(key) === value}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${params.get(key) === value ? "border-teal bg-mint/40 text-navy" : "bg-white hover:border-teal/40"}`}
            onClick={() => change(key, params.get(key) === value ? "" : value)}
          >
            {label}
          </button>
        ))}
      </div>
      {showFilters && (
        <Card className="space-y-4 rounded-2xl p-5">
          <Input
            aria-label="Thành phố ứng viên"
            placeholder="Thành phố ứng viên (tùy chọn)"
            maxLength={100}
            value={params.get("city") ?? ""}
            onChange={(e) => change("city", e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            {[
              ["sameCity", "Cùng thành phố"],
              ["petFriendly", "Yêu thú cưng"],
              ["nonSmoking", "Không hút thuốc"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={params.get(key) === "true"}
                  onChange={(e) => change(key, e.target.checked ? "true" : "")}
                />
                {label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              Điểm tối thiểu
              <select
                aria-label="Điểm tối thiểu"
                value={params.get("minScore") ?? ""}
                onChange={(e) => change("minScore", e.target.value)}
                className="rounded-lg border p-2"
              >
                <option value="">Tất cả</option>
                <option value="70">70%</option>
                <option value="80">80%</option>
                <option value="90">90%</option>
              </select>
            </label>
            <Button variant="outline" onClick={() => setAdvanced((v) => !v)}>
              Bộ lọc Premium
            </Button>
            <Button variant="ghost" onClick={() => setParams({})}>
              Xóa bộ lọc
            </Button>
          </div>
          {advanced && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["district", "Quận / khu vực", "text"],
                ["budgetMin", "Ngân sách từ (VND)", "number"],
                ["budgetMax", "Ngân sách đến (VND)", "number"],
                ["minCleanliness", "Sạch sẽ tối thiểu (1–5)", "number"],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type={type}
                    min={key === "minCleanliness" ? 1 : 0}
                    max={key === "minCleanliness" ? 5 : undefined}
                    value={params.get(key) ?? ""}
                    onChange={(e) => change(key, e.target.value)}
                  />
                </div>
              ))}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.verifiedOnly}
                  onChange={(e) =>
                    change("verifiedOnly", e.target.checked ? "true" : "")
                  }
                />
                Chỉ hồ sơ đã xác minh
              </label>
              <select
                aria-label="Không gian phòng"
                value={params.get("roomEnvironment") ?? ""}
                onChange={(e) => change("roomEnvironment", e.target.value)}
                className="rounded-xl border p-2"
              >
                <option value="">Mọi không gian</option>
                <option value="quiet">Yên tĩnh</option>
                <option value="moderate">Vừa phải</option>
                <option value="lively">Sôi nổi</option>
              </select>
            </div>
          )}
          <label className="flex items-center gap-3 text-sm">
            Dọn vào trước
            <Input
              type="date"
              className="w-auto"
              value={params.get("moveInBy") ?? ""}
              onChange={(e) => change("moveInBy", e.target.value)}
            />
          </label>
        </Card>
      )}
      <QueryState query={query} />
      {query.data && !query.data.items.length && (
        <p role="status" className="py-12 text-center text-muted-foreground">
          Chưa có kết quả. Thử bỏ bộ lọc hoặc tìm người phù hợp bằng lượt quét.
        </p>
      )}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {query.data?.items.map((r) => (
          <Card
            key={r.id}
            className="group overflow-hidden rounded-2xl border-0 p-0 shadow-sm transition-shadow hover:shadow-lg"
          >
            <div className="gradient-brand relative h-32">
              <div className="absolute -bottom-9 left-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-mint ring-4 ring-white">
                {r.avatarUrl ? (
                  <img
                    src={r.avatarUrl}
                    alt={r.name}
                    className="h-20 w-20 rounded-2xl"
                  />
                ) : (
                  r.name.slice(0, 1)
                )}
              </div>
              <div className="absolute right-4 top-4 rounded-full bg-white p-1 shadow-sm">
                <CompatRing score={r.score} size={56} />
              </div>
            </div>
            <div className="p-5 pt-12">
              <h2 className="text-xl font-semibold">
                {r.name}
                {r.age !== null ? `, ${r.age}` : ""}
              </h2>
              <p className="text-sm text-muted-foreground">{r.occupation}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {r.city}
              </p>
              <p className="mt-3 text-sm">{r.explanation}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.interests.slice(0, 3).map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full bg-mint/30 px-2.5 py-1 text-xs text-navy"
                  >
                    {interest}
                  </span>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {r.breakdown.slice(0, 3).map((b) => (
                  <div key={b.key}>
                    <div className="flex justify-between text-xs">
                      <span>{b.label}</span>
                      <span>{b.value}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div
                        className="gradient-brand h-full rounded-full"
                        style={{ width: `${b.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link to={`/profile/${r.id}`}>Xem hồ sơ</Link>
                </Button>
                <Button
                  size="icon"
                  className="shrink-0 bg-teal text-white hover:bg-teal/90"
                  aria-label={`Nhắn tin với ${r.name}`}
                  disabled={startChat.isPending}
                  onClick={() => startChat.mutate(r.id)}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`${saved.ids.includes(r.id) ? "Bỏ lưu" : "Lưu"} hồ sơ ${r.name}`}
                  aria-pressed={saved.ids.includes(r.id)}
                  disabled={
                    saved.query.isPending ||
                    saved.query.isError ||
                    saved.mutation.isPending
                  }
                  onClick={() =>
                    saved.mutation.mutate(
                      { id: r.id, saved: !saved.ids.includes(r.id) },
                      { onError: (e) => toast.error(e.message) },
                    )
                  }
                >
                  <Bookmark
                    className={`h-4 w-4 ${saved.ids.includes(r.id) ? "fill-navy text-navy" : ""}`}
                  />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
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
