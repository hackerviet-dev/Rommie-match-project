import { QuizHistory } from "@/features/quiz";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth";
import { profileApi } from "@/features/profile";
import { lifestyleApi } from "@/features/lifestyle/services/lifestyle-api";
import { ApiError } from "@/services/api-error";
import * as m from "motion/react-m";
import { AppShell, CompatRing } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { roommates } from "@/mocks/data/mock-data";
import {
  Heart,
  MessageCircle,
  Store,
  Bookmark,
  TrendingUp,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export function DashboardScreen() {
  const location = useLocation();
  const suggestionsPage = Number.isSafeInteger(location.state?.suggestionsPage) ? location.state.suggestionsPage : 0;
  const suggestedRoommates = Array.from({ length: Math.min(4, roommates.length) }, (_, index) =>
    roommates[(suggestionsPage + index) % roommates.length],
  );
  const user = useAuthStore(state => state.user);
  const profile = useQuery({ queryKey: ["profile", "me", user?.id], queryFn: profileApi.getMine, enabled: Boolean(user?.id) });
  const lifestyle = useQuery({ queryKey: ["lifestyle", "me", user?.id], enabled: Boolean(user?.id), queryFn: async () => {
    try { return await lifestyleApi.getMine(); }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
  } });
  const displayName = profile.data?.displayName || user?.name || "bạn";
  const completion = profile.data?.profileCompletion;
  const stats = [
    {
      i: Heart,
      label: "Người ở ghép phù hợp",
      value: "24",
      change: "+6 tuần này",
      color: "from-teal/20 to-teal/5",
      icon: "text-teal",
    },
    {
      i: MessageCircle,
      label: "Tin nhắn",
      value: "8",
      change: "3 chưa đọc",
      color: "from-navy/15 to-navy/5",
      icon: "text-navy",
    },
    {
      i: Bookmark,
      label: "Hồ sơ đã lưu",
      value: "12",
      change: "+2 hôm nay",
      color: "from-mint/40 to-mint/10",
      icon: "text-navy",
    },
    {
      i: Store,
      label: "Dịch vụ gần đây",
      value: "32",
      change: "trong 2 km",
      color: "from-amber-200/40 to-amber-100/10",
      icon: "text-amber-600",
    },
  ];
  return (
    <AppShell>
      <m.div
        className="flex items-end justify-between flex-wrap gap-4"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-display font-bold">Chào mừng trở lại, {displayName} 👋</h1>
          <p className="text-muted-foreground mt-1">
            Đây là những gì đang diễn ra với hành trình tìm bạn của bạn.
          </p>
        </div>
        <Link to="/matches">
          <Button className="rounded-full bg-navy hover:bg-navy/90 text-white">
            Khám phá ở ghép <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </m.div>

      <p className="mt-5 text-xs text-muted-foreground">Số liệu hoạt động và gợi ý bên dưới đang là minh họa.</p>
      <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, index) => (
          <m.div
            key={s.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07 }}
            whileHover={{ y: -4 }}
          >
            <Card
              className={`h-full p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br ${s.color}`}
            >
              <div className={`h-10 w-10 rounded-xl bg-white/70 grid place-items-center ${s.icon}`}>
                <s.i className="h-5 w-5" />
              </div>
              <div className="mt-4 text-3xl font-display font-bold">{s.value}</div>
              <div className="text-sm font-medium mt-0.5">{s.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.change}</div>
            </Card>
          </m.div>
        ))}
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-display font-bold text-lg">Hoàn thiện hồ sơ</div>
                <div className="text-sm text-muted-foreground">
                  Hồ sơ đầy đủ nhận được nhiều hơn gấp 3 lần ghép đôi.
                </div>
              </div>
              <Badge className="rounded-full bg-mint/40 text-navy border-0">{completion === undefined ? "Đang cập nhật" : `${completion}%`}</Badge>
            </div>
            <Progress value={completion ?? 0} className="mt-4 h-2.5" />
            {profile.isError && <p role="alert" className="mt-2 text-xs text-destructive">Chưa tải được hồ sơ. <button onClick={() => void profile.refetch()} className="underline">Thử lại</button></p>}
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-full bg-mint/30 text-navy font-medium">
                {profile.data?.displayName && profile.data.city ? "✓ Thông tin cơ bản" : "Thông tin cơ bản"}
              </span>
              <span className="px-3 py-1.5 rounded-full bg-mint/30 text-navy font-medium">
                {lifestyle.data ? "✓ Lối sống" : "Bổ sung lối sống"}
              </span>
              <span className="px-3 py-1.5 rounded-full bg-mint/30 text-navy font-medium">
                <Link to="/quiz">Làm khảo sát</Link>
              </span>
              <span className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
                {profile.data?.avatarUrl ? "✓ Ảnh đại diện" : "+ Thêm ảnh"}
              </span>
              <span className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
                {profile.data?.isVerified ? "✓ Đã xác minh" : "Chưa xác minh"}
              </span>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="font-display font-bold text-lg">Gợi ý cho bạn</div>
              <Link to="/matches" className="text-sm text-teal font-medium hover:underline">
                Xem tất cả
              </Link>
            </div>
            <m.div key={location.key} className="grid sm:grid-cols-2 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {suggestedRoommates.map((r) => (
                <Link key={r.id} to={`/profile/${r.id}`} className="group">
                  <div className="flex items-center gap-4 p-4 rounded-2xl border hover:border-teal/40 hover:shadow-md transition-all">
                    <img src={r.avatar} alt={r.name} className="h-14 w-14 rounded-xl bg-mint/30" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{r.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.occupation} · {r.age}
                      </div>
                    </div>
                    <CompatRing score={r.score} size={48} />
                  </div>
                </Link>
              ))}
            </m.div>
          </Card>

          <QuizHistory />
        </div>

        <div className="space-y-6">
          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <div className="font-display font-bold text-lg">Hoạt động gần đây</div>
            <ul className="mt-4 space-y-4">
              {[
                { i: Heart, t: "Linh đã xem hồ sơ của bạn", time: "2 phút trước" },
                { i: MessageCircle, t: "Tin nhắn mới từ Minh", time: "1 giờ trước" },
                { i: Sparkles, t: "Ghép đôi mới 92%: Hà My", time: "3 giờ trước" },
                { i: TrendingUp, t: "Hồ sơ của bạn đang nổi ở Quận 1", time: "1 ngày trước" },
              ].map((a, i) => (
                <li key={i} className="flex gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-mint/30 grid place-items-center text-navy">
                    <a.i className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{a.t}</div>
                    <div className="text-xs text-muted-foreground">{a.time}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6 rounded-2xl border-0 shadow-md gradient-brand text-white">
            <Sparkles className="h-6 w-6" />
            <div className="mt-3 font-display font-bold text-lg">Nâng cấp Premium</div>
            <p className="text-sm text-white/85 mt-1">
              Mở khoá bộ lọc nâng cao, boost hồ sơ và ghép đôi ưu tiên.
            </p>
            <Link to="/premium">
              <Button className="mt-4 w-full rounded-xl bg-white text-navy hover:bg-white/90">
                Nâng cấp 20.000₫/tháng
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
