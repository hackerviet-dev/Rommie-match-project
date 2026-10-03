import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth";
import { profileApi } from "@/features/profile";
import { savedProfilesApi } from "@/features/profile/hooks/use-saved-profiles";
import { matchingApi } from "@/features/matching";
import { chatApi } from "@/features/chat/services/chat-api";
import { hyperlocalApi } from "@/features/hyperlocal";
import { billingApi } from "@/features/billing";
import { QuizHistory } from "@/features/quiz";
import { MatchingRefresh } from "@/features/matching/components/matching-refresh";
import { MatchRequests } from "@/features/matching/components/match-requests";
import { AppShell, CompatRing } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QueryState } from "@/components/common/query-state";
export function DashboardScreen() {
  const me = useAuthStore((s) => s.user),
    location = useLocation(),
    profile = useQuery({
      queryKey: ["profile", "me", me?.id],
      queryFn: profileApi.getMine,
    }),
    matches = useQuery({
      queryKey: ["matching", "dashboard", me?.id],
      queryFn: () => matchingApi.list({ pageSize: 4 }),
    }),
    saved = useQuery({
      queryKey: ["saved-profiles", "dashboard", me?.id],
      queryFn: () => savedProfilesApi.list(),
    }),
    chat = useQuery({
      queryKey: ["chat", "dashboard", me?.id],
      queryFn: () => chatApi.list(),
    }),
    services = useQuery({
      queryKey: ["services", "dashboard", profile.data?.city],
      queryFn: () => hyperlocalApi.list(profile.data?.city),
      enabled: Boolean(profile.data?.city),
    }),
    subscription = useQuery({
      queryKey: ["subscription", "me", me?.id],
      queryFn: billingApi.subscription,
    });
  const refetchMatches = matches.refetch;
  useEffect(() => {
    void refetchMatches();
  }, [location.key, refetchMatches]);
  const stats = [
    {
      label: "Người phù hợp",
      value: matches.data?.totalCount,
      url: "/matches",
      query: matches,
    },
    {
      label: "Hội thoại",
      value: chat.data?.totalCount,
      url: "/chat",
      query: chat,
    },
    {
      label: "Hồ sơ đã lưu",
      value: saved.data?.totalCount,
      url: "/settings?section=saved",
      query: saved,
    },
    {
      label: "Dịch vụ tại thành phố",
      value: services.data?.totalCount,
      url: "/services",
      query: services,
    },
  ];
  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">
            Chào mừng trở lại, {profile.data?.displayName ?? me?.name ?? "bạn"}{" "}
            👋
          </h1>
          <p className="mt-2 text-muted-foreground">
            Tìm người phù hợp và theo dõi hành trình ở ghép của bạn.
          </p>
        </div>
        <Button asChild>
          <Link to="/matches">Khám phá ở ghép →</Link>
        </Button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="rounded-2xl bg-mint/15 p-5">
            <Link to={s.url}>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <strong className="mt-3 block text-3xl">
                {s.query.isError ? "—" : (s.value ?? "…")}
              </strong>
            </Link>
            {s.query.isError && (
              <button
                className="mt-2 text-xs text-destructive underline"
                onClick={() => void s.query.refetch()}
              >
                Tải lại
              </button>
            )}
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="rounded-3xl p-6">
            <h2 className="text-xl font-semibold">Hồ sơ của bạn</h2>
            <QueryState query={profile} />
            {profile.data && (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  Mức độ hoàn thiện: {profile.data.profileCompletion}%
                </p>
                <Progress
                  value={profile.data.profileCompletion}
                  className="mt-3"
                />
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/settings">Xem / sửa hồ sơ</Link>
                </Button>
              </>
            )}
          </Card>
          <Card className="rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Gợi ý cho bạn</h2>
              <Link className="text-sm text-teal" to="/matches">
                Xem tất cả
              </Link>
            </div>
            <QueryState query={matches} />
            {matches.data?.totalCount === 0 && (
              <p className="py-6 text-muted-foreground">
                Chưa có kết quả ghép đôi. Tìm người phù hợp để tạo danh sách.
              </p>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {matches.data?.items.map((r) => (
                <Link
                  key={r.id}
                  to={`/profile/${r.id}`}
                  className="flex items-center gap-3 rounded-2xl border p-4 hover:border-teal"
                >
                  {r.avatarUrl ? (
                    <img
                      src={r.avatarUrl}
                      alt={r.name}
                      className="h-12 w-12 rounded-xl"
                    />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-mint/20">
                      {r.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{r.name}</h3>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.occupation}
                      {r.age !== null ? ` · ${r.age}` : ""}
                    </p>
                  </div>
                  <CompatRing score={r.score} size={48} />
                </Link>
              ))}
            </div>
          </Card>
          <QuizHistory />
        </div>
        <div className="space-y-6">
          <MatchingRefresh />
          <Card className="rounded-3xl p-6">
            <h2 className="text-xl font-semibold">Gói thành viên</h2>
            <QueryState query={subscription} />
            {subscription.data && (
              <p className="mt-3 text-teal">
                {subscription.data.isPremium ? "Premium" : "Miễn phí"}
              </p>
            )}
            <Button asChild variant="outline" className="mt-4">
              <Link to="/premium">Xem quyền lợi</Link>
            </Button>
          </Card>
          <MatchRequests />
        </div>
      </div>
    </AppShell>
  );
}
