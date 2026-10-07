import { useQuery } from "@tanstack/react-query";
import { chatApi } from "@/features/chat/services/chat-api";
import { QueryState } from "@/components/common/query-state";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Heart,
  MessageCircle,
  Store,
  Settings,
  Sparkles,
  Menu,
  Bell,
  TrendingUp,
  Crown,
  House,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AccountMenu, getActorHome, useAuthStore } from "@/features/auth";
import { HeaderSearch } from "@/components/common/header-search";
import { tokenStorage } from "@/services/token-storage";
import { useNotifications } from "@/features/notifications";

function NotificationBell() {
  const { query: notifications, read, readVisible } = useNotifications();
  const [open, setOpen] = useState(false);
  const { mutate: markVisibleRead, isPending: markingRead, isError: readFailed } = readVisible;
  useEffect(() => {
    if (!open || markingRead || readFailed) return;
    const unreadIds = notifications.data?.items.filter((n) => !n.readAt).map((n) => n.id) ?? [];
    if (unreadIds.length) markVisibleRead(unreadIds);
  }, [open, markingRead, readFailed, notifications.data, markVisibleRead]);
  const me = useAuthStore((s) => s.user?.id),
    query = useQuery({
      queryKey: ["chat", "notifications", me],
      queryFn: () => chatApi.list(),
      enabled: Boolean(me),
      refetchInterval: 15000,
    });
  const unread = (query.data?.items.reduce((n, c) => n + c.unreadCount, 0) ?? 0) + (notifications.data?.unreadCount ?? 0);
  return (
    <Popover open={open} onOpenChange={(value) => { readVisible.reset(); setOpen(value); }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Thông báo"
          className="relative rounded-full"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs text-white">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-4">
        <h2 className="font-semibold">Thông báo của bạn</h2>
        <QueryState query={notifications} />
        <div className="max-h-72 overflow-y-auto">
          {notifications.data?.items.map((n) => (
            <Link key={n.id} to={n.data.roomId ? `/rooms/${n.data.roomId}` : n.data.url?.startsWith("/") && !n.data.url.startsWith("//") && !n.data.url.includes("\\") ? n.data.url : "/settings"}
              onClick={() => { if (!n.readAt) read.mutate(n.id); }}
              className={`mt-3 block rounded-xl p-3 ${n.readAt ? "bg-muted/40 text-muted-foreground hover:bg-muted/70" : n.data.status === "approved" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>
              <strong className="text-sm">{n.data.status === "approved" && "✓ "}{n.title}{!n.readAt && " · Mới"}</strong>
              <p className="mt-1 text-xs">{n.data.roomTitle}</p>
              <p className="mt-1 text-xs">{n.body}</p>
            </Link>
          ))}
        </div>
        {(read.isError || readFailed) && <p role="alert" className="text-sm text-destructive">Không thể đánh dấu đã đọc. Đóng và mở lại bảng thông báo để thử lại.</p>}
        <h2 className="mt-4 font-semibold">Tin nhắn chưa đọc</h2>
        <QueryState query={query} />
        {query.data && !query.data.items.some((c) => c.unreadCount > 0) && (
          <p className="py-5 text-sm text-muted-foreground">
            Không có tin nhắn chưa đọc trong danh sách gần đây.
          </p>
        )}
        {query.data?.items
          .filter((c) => c.unreadCount > 0)
          .map((c) => (
            <Link
              key={c.id}
              to={`/chat?conversation=${c.id}`}
              className="mt-3 block rounded-xl bg-mint/15 p-3"
            >
              <strong className="text-sm">
                {c.partner.displayName} · {c.unreadCount}
              </strong>
              <p className="mt-1 truncate text-xs">{c.lastMessage?.content || (c.lastMessage?.imageUrl ? "Đã gửi một ảnh" : "")}</p>
            </Link>
          ))}
        <Link to="/chat" className="mt-4 block text-center text-sm text-teal">
          Mở tất cả hội thoại
        </Link>
      </PopoverContent>
    </Popover>
  );
}

const nav = [
  { to: "/matches", label: "Ở ghép", icon: Heart },
  { to: "/rooms", label: "Tìm phòng", icon: House },
  { to: "/chat", label: "Tin nhắn", icon: MessageCircle },
  { to: "/services", label: "Dịch vụ", icon: Store },
  { to: "/premium", label: "Premium", icon: Sparkles },
];

export function Logo({ className = "" }: { className?: string }) {
  const role = useAuthStore((s) => s.user?.role);
  const hasSession = useAuthStore(
    (s) => s.isInitialized && s.isAuthenticated && Boolean(s.user),
  );
  const location = useLocation();
  const isMember =
    hasSession &&
    Boolean(tokenStorage.getAccessToken() || tokenStorage.getRefreshToken()) &&
    location.pathname !== "/login" &&
    location.pathname !== "/register";
  const navigate = useNavigate();
  return (
    <Link
      to={isMember ? getActorHome(role) : "/"}
      onClick={(event) => {
        if (
          !isMember ||
          getActorHome(role) !== "/dashboard" ||
          location.pathname !== "/dashboard" ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        });
        const suggestionsPage = Number.isSafeInteger(
          location.state?.suggestionsPage,
        )
          ? location.state.suggestionsPage
          : 0;
        navigate("/dashboard", {
          replace: true,
          state: { suggestionsPage: suggestionsPage + 1 },
        });
      }}
      className={`flex items-center gap-2 font-display font-bold text-lg ${className}`}
    >
      <img
        src={`${import.meta.env.BASE_URL}logo-mark.png`}
        alt="RoomieMatch"
        className="h-10 w-10 object-contain"
      />
      <span>
        <span className="text-navy">Roomie</span>
        <span className="text-teal">Match</span>
      </span>
    </Link>
  );
}

export function AppShell({
  children,
  fullHeight = false,
  hideHeader = false,
}: {
  children: ReactNode;
  fullHeight?: boolean;
  hideHeader?: boolean;
}) {
  const path = useLocation().pathname;
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isMember = isInitialized && isAuthenticated && Boolean(user);
  const showNavigation = path !== "/premium" || isMember;
  const visibleNav = isMember
    ? nav
    : [
        { to: "/", label: "Trang chủ", icon: Home },
        ...nav.filter(
          (item) =>
            item.to === "/rooms" ||
            item.to === "/services" ||
            item.to === "/premium",
        ),
      ];

  return (
    <div
      className={
        fullHeight
          ? "flex h-dvh flex-col overflow-hidden bg-background"
          : "min-h-screen bg-background"
      }
    >
      <a href="#main-content" className="skip-link">
        Đến nội dung chính
      </a>
      {!hideHeader &&
        (showNavigation ? (
          <header className="sticky top-0 z-40 glass border-b border-border/60">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
              <div className="flex items-center gap-6">
                <Logo className="[&>span]:hidden sm:[&>span]:inline" />
                <nav
                  aria-label="Điều hướng chính"
                  className="hidden lg:flex items-center gap-1"
                >
                  {visibleNav
                    .filter(
                      (n) =>
                        n.to !== "/chat" && (!isMember || n.to !== "/premium"),
                    )
                    .map((n) => {
                      const active =
                        n.to === "/" ? path === "/" : path.startsWith(n.to);
                      return (
                        <Link
                          key={n.to}
                          to={n.to}
                          aria-current={active ? "page" : undefined}
                          className={`px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                        >
                          {n.label}
                        </Link>
                      );
                    })}
                </nav>
              </div>
              {isMember && (
                <div className="hidden min-w-0 flex-1 justify-center px-4 xl:flex">
                  <HeaderSearch />
                </div>
              )}
              <div className="flex shrink-0 items-center gap-2">
                {isMember ? (
                  <>
                    <div className="xl:hidden">
                      <HeaderSearch />
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className={`gap-1.5 rounded-full text-amber-950 shadow-sm hover:bg-amber-300 ${path.startsWith("/premium") ? "bg-amber-300" : "bg-amber-200"}`}
                    >
                      <Link
                        to="/premium"
                        aria-label="Premium"
                        aria-current={
                          path.startsWith("/premium") ? "page" : undefined
                        }
                      >
                        <Crown className="h-4 w-4" />{" "}
                        <span className="hidden sm:inline">Premium</span>
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className={`h-9 w-9 rounded-full transition-colors ${path.startsWith("/chat") ? "bg-mint/30 text-teal hover:bg-mint/40" : "bg-muted/60 text-navy/80 hover:bg-muted"}`}
                    >
                      <Link
                        to="/chat"
                        aria-label="Tin nhắn"
                        title="Tin nhắn"
                        aria-current={
                          path.startsWith("/chat") ? "page" : undefined
                        }
                      >
                        <MessageCircle
                          className="h-[18px] w-[18px]"
                          strokeWidth={2}
                        />
                      </Link>
                    </Button>
                    <NotificationBell />
                    <AccountMenu />
                  </>
                ) : (
                  <>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/login">Đăng nhập</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link to="/register">Đăng ký</Link>
                    </Button>
                  </>
                )}
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Mở menu"
                      className="lg:hidden"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-72">
                    <SheetTitle>Khám phá RoomieMatch</SheetTitle>
                    <SheetDescription>
                      Hồ sơ, ghép đôi và cuộc sống ở chung.
                    </SheetDescription>
                    <div className="mt-8 flex flex-col gap-1">
                      {visibleNav.map((n) => (
                        <Link
                          key={n.to}
                          to={n.to}
                          aria-current={
                            (
                              n.to === "/"
                                ? path === "/"
                                : path.startsWith(n.to)
                            )
                              ? "page"
                              : undefined
                          }
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-muted"
                        >
                          <n.icon className="h-4 w-4" /> {n.label}
                        </Link>
                      ))}
                      {isMember && (
                        <Link
                          to="/settings"
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-muted"
                        >
                          <Settings className="h-4 w-4" /> Cài đặt
                        </Link>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </header>
        ) : (
          <header className="sticky top-0 z-40 glass border-b border-border/50">
            <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
              <Logo className="[&>span]:hidden sm:[&>span]:inline" />
              <nav
                aria-label="Điều hướng công khai"
                className="order-3 flex w-full justify-center gap-7 text-sm font-medium text-muted-foreground md:order-none md:w-auto"
              >
                <Link to="/" className="hover:text-foreground">
                  Trang chủ
                </Link>
                <Link
                  to="/premium"
                  aria-current="page"
                  className="font-semibold text-navy"
                >
                  Premium
                </Link>
              </nav>
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" className="rounded-full">
                  <Link to="/login">Đăng nhập</Link>
                </Button>
                <Button
                  asChild
                  className="rounded-full bg-navy text-white hover:bg-navy/90"
                >
                  <Link to="/register">Đăng ký</Link>
                </Button>
              </div>
            </div>
          </header>
        ))}

      <main
        id="main-content"
        tabIndex={-1}
        className={
          fullHeight
            ? "min-h-0 flex-1 overflow-hidden"
            : "mx-auto max-w-7xl px-4 sm:px-6 pb-28 lg:pb-10 pt-8 sm:pt-10"
        }
      >
        {children}
      </main>

      {!hideHeader && showNavigation && !fullHeight && (
        <nav
          aria-label="Điều hướng nhanh"
          className="lg:hidden fixed bottom-[max(.75rem,env(safe-area-inset-bottom))] inset-x-3 z-40 glass rounded-2xl shadow-lg border border-border/60"
        >
          <div className={`grid ${isMember ? "grid-cols-5" : "grid-cols-4"}`}>
            {visibleNav.map((n) => {
              const active =
                n.to === "/" ? path === "/" : path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-teal" : "text-muted-foreground"}`}
                >
                  <n.icon
                    className={`h-5 w-5 ${active ? "fill-mint/40" : ""}`}
                  />
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export function CompatRing({
  score,
  size = 64,
}: {
  score: number;
  size?: number;
}) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#g)"
          strokeWidth="6"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#0B3B6E" />
            <stop offset="60%" stopColor="#15A9B8" />
            <stop offset="100%" stopColor="#8FD3C1" />
          </linearGradient>
        </defs>
      </svg>
      <div
        className="absolute inset-0 grid place-items-center font-display font-bold text-navy"
        style={{ fontSize: size * 0.28 }}
      >
        {score}%
      </div>
    </div>
  );
}
