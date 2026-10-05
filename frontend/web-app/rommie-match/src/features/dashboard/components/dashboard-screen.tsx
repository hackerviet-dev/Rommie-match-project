import { useEffect } from "react";
import { OnboardingStatus } from "@/features/onboarding";
import * as m from "motion/react-m";
import { Heart, MessageCircle, Bookmark, Store, Sparkles } from "lucide-react";
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
      icon: Heart,
      color: "from-teal/20 to-teal/5",
    },
    {
      label: "Hội thoại",
      value: chat.data?.totalCount,
      url: "/chat",
      query: chat,
      icon: MessageCircle,
      color: "from-navy/15 to-navy/5",
    },
    {
      label: "Hồ sơ đã lưu",
      value: saved.data?.totalCount,
      url: "/settings?section=saved",
      query: saved,
      icon: Bookmark,
      color: "from-mint/40 to-mint/10",
    },
    {
      label: "Dịch vụ tại thành phố",
      value: services.data?.totalCount,
      url: "/services",
      query: services,
      icon: Store,
      color: "from-amber-200/40 to-amber-100/10",
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
        {stats.map((s, index) => (
          <m.div
            key={s.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07 }}
            whileHover={{ y: -4 }}
          >
            <Card
              className={`h-full rounded-2xl border-0 bg-gradient-to-br p-5 shadow-sm ${s.color}`}
            >
              <Link to={s.url}>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/70 text-navy">
                  <s.icon className="h-5 w-5" />
                </div>
                <strong className="mt-3 block text-3xl">
                  {s.query.isError ? "—" : (s.value ?? "…")}
                </strong>
                <p className="mt-1 text-sm font-medium">{s.label}</p>
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
          </m.div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="rounded-2xl border-0 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Hoàn thiện hồ sơ</h2>
              <span className="rounded-full bg-mint/40 px-3 py-1 text-sm text-navy">
                {profile.data ? `${profile.data.profileCompletion}%` : "…"}
              </span>
            </div>
            <QueryState query={profile} />
            <OnboardingStatus />
            {profile.data && (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  Mức độ hoàn thiện: {profile.data.profileCompletion}%
                </p>
                <Progress
                  value={profile.data.profileCompletion}
                  className="mt-3"
                />
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-mint/30 px-3 py-1.5">
                    ✓ Thông tin cơ bản
                  </span>
                  <Link
                    to="/quiz"
                    className="rounded-full bg-mint/30 px-3 py-1.5"
                  >
                    Khảo sát lối sống
                  </Link>
                  <span className="rounded-full bg-muted px-3 py-1.5">
                    {profile.data.avatarUrl
                      ? "✓ Ảnh đại diện"
                      : "Thêm ảnh đại diện"}
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1.5">
                    {profile.data.isVerified
                      ? "✓ Đã xác minh"
                      : "Chưa xác minh"}
                  </span>
                </div>
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
                  className="flex items-center gap-4 rounded-2xl border p-4 transition-all hover:border-teal/40 hover:shadow-md"
                >
                  {r.avatarUrl ? (
                    <img
                      src={r.avatarUrl}
                      alt={r.name}
                      className="h-14 w-14 rounded-xl bg-mint/30"
                    />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-xl bg-mint/20">
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
          <Card className="rounded-2xl border-0 p-6 shadow-sm">
            <h2 className="text-lg font-display font-bold">
              Hoạt động gần đây
            </h2>
            <QueryState query={chat} />
            <ul className="mt-4 space-y-4">
              {chat.data?.items
                .filter((c) => c.lastMessage)
                .slice(0, 4)
                .map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/chat?conversation=${c.id}`}
                      className="flex gap-3"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint/30 text-navy">
                        <MessageCircle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {c.partner.displayName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.lastMessage?.content}
                        </p>
                        <time className="text-xs text-muted-foreground">
                          {new Date(c.lastMessage!.createdAt).toLocaleString(
                            "vi-VN",
                          )}
                        </time>
                      </div>
                    </Link>
                  </li>
                ))}
            </ul>
            {chat.data && !chat.data.items.some((c) => c.lastMessage) && (
              <p className="mt-4 text-sm text-muted-foreground">
                Chưa có tin nhắn gần đây. Mở hồ sơ phù hợp để bắt đầu trò
                chuyện.
              </p>
            )}
          </Card>
          <Card className="gradient-brand rounded-2xl border-0 p-6 text-white shadow-md">
            <Sparkles className="mb-3 h-6 w-6" />
            <h2 className="text-xl font-semibold">Gói thành viên</h2>
            <QueryState query={subscription} />
            {subscription.data && (
              <p className="mt-3 text-white/85">
                {subscription.data.isPremium ? "Premium" : "Miễn phí"}
              </p>
            )}
            <Button
              asChild
              className="mt-4 w-full bg-white text-navy hover:bg-white/90"
            >
              <Link to="/premium">Xem quyền lợi</Link>
            </Button>
          </Card>
          <Card className="rounded-2xl p-6">
            <h2 className="text-lg font-display font-bold">
              Không gian ở ghép
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Nhận lời mời, quản lý nhóm và gửi yêu cầu hòa giải khi cần hỗ trợ.
            </p>
            <div className="mt-4 grid gap-3">
              <Button asChild variant="outline">
                <Link to="/groups">Nhóm ở ghép của tôi</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/disputes">Yêu cầu hòa giải</Link>
              </Button>
            </div>
          </Card>
          <MatchingRefresh />
          <MatchRequests />
        </div>
      </div>
    </AppShell>
  );
}
