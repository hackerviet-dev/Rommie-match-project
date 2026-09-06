import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link, useLocation } from "react-router-dom";
import { Home, Heart, MessageCircle, Store, Settings, Sparkles, Menu, Bell, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuthStore } from "@/stores/auth-store";

const NOTIFICATIONS = [
  { i: Heart, t: "Linh đã xem hồ sơ của bạn", time: "2 phút", color: "text-rose-500 bg-rose-50", unread: true },
  { i: MessageCircle, t: "Minh: Mình ok chia tiền điện nước 50/50.", time: "1 giờ", color: "text-teal bg-mint/30", unread: true },
  { i: Sparkles, t: "Ghép đôi mới 92% với Hà My", time: "3 giờ", color: "text-amber-600 bg-amber-50", unread: true },
  { i: TrendingUp, t: "Hồ sơ của bạn đang nổi ở Quận 1", time: "1 ngày", color: "text-navy bg-mint/20", unread: false },
  { i: Store, t: "Dịch vụ Giặt ủi mới gần bạn (0,6 km)", time: "2 ngày", color: "text-navy bg-muted", unread: false },
];

function NotificationBell() {
  const unread = NOTIFICATIONS.filter(n => n.unread).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Thông báo" className="rounded-full relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-teal text-white text-[10px] font-bold grid place-items-center">{unread}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-display font-bold">Thông báo</div>
          <span className="text-xs text-muted-foreground">{unread} chưa đọc</span>
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {NOTIFICATIONS.map((n, i) => (
            <li key={i} className={`flex gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/50 ${n.unread ? "bg-mint/5" : ""}`}>
              <div className={`h-9 w-9 shrink-0 rounded-xl grid place-items-center ${n.color}`}><n.i className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm leading-snug">{n.t}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{n.time} trước</div>
              </div>
              {n.unread && <div className="h-2 w-2 rounded-full bg-teal mt-2 shrink-0" />}
            </li>
          ))}
        </ul>
        <Link to="/dashboard" className="block text-center text-sm font-medium text-teal hover:bg-muted py-3 border-t">Xem tất cả</Link>
      </PopoverContent>
    </Popover>
  );
}

const nav = [
  { to: "/dashboard", label: "Trang chính", icon: Home },
  { to: "/matches", label: "Ghép đôi", icon: Heart },
  { to: "/chat", label: "Tin nhắn", icon: MessageCircle },
  { to: "/services", label: "Dịch vụ", icon: Store },
  { to: "/premium", label: "Premium", icon: Sparkles },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-display font-bold text-lg ${className}`}>
      <img src={`${import.meta.env.BASE_URL}logo-mark.png`} alt="RoomieMatch" className="h-10 w-10 object-contain" />
      <span>
        <span className="text-navy">Roomie</span>
        <span className="text-teal">Match</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useLocation().pathname;
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const initials = user?.name?.trim().slice(0, 2).toUpperCase() || "ME";

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="skip-link">Đến nội dung chính</a>
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo />
            <nav aria-label="Điều hướng chính" className="hidden lg:flex items-center gap-1">
              {nav.map((n) => {
                const active = path.startsWith(n.to);
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
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link to="/settings" aria-label="Cài đặt tài khoản" className="grid h-11 w-11 place-items-center rounded-full">
              <Avatar className="h-9 w-9 ring-2 ring-mint">
                <AvatarImage
                  src={user?.avatar ?? "https://api.dicebear.com/9.x/avataaars/svg?seed=Me"}
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Link>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Mở menu" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetTitle>Khám phá RoomieMatch</SheetTitle>
                <SheetDescription>Hồ sơ, ghép đôi và cuộc sống ở chung.</SheetDescription>
                <div className="mt-8 flex flex-col gap-1">
                  {nav.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      aria-current={path.startsWith(n.to) ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-muted"
                    >
                      <n.icon className="h-4 w-4" /> {n.label}
                    </Link>
                  ))}
                  <Link
                    to="/settings"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-muted"
                  >
                    <Settings className="h-4 w-4" /> Cài đặt
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 sm:px-6 pb-28 lg:pb-10 pt-8 sm:pt-10">{children}</main>

      <nav aria-label="Điều hướng nhanh" className="lg:hidden fixed bottom-[max(.75rem,env(safe-area-inset-bottom))] inset-x-3 z-40 glass rounded-2xl shadow-lg border border-border/60">
        <div className="grid grid-cols-5">
          {nav.map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-teal" : "text-muted-foreground"}`}
              >
                <n.icon className={`h-5 w-5 ${active ? "fill-mint/40" : ""}`} />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function CompatRing({ score, size = 64 }: { score: number; size?: number }) {
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
