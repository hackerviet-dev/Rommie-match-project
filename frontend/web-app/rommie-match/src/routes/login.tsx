import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@/components/app-shell";
import { useAuthStore } from "@/stores/auth-store";
import { apiRequest, sessionUser, type AuthSession } from "@/lib/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async (email: string, password: string) => {
    setBusy(true);
    setError("");
    try {
      const session = await apiRequest<AuthSession>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      login(sessionUser(session), session.accessToken);
      const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
      nav(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đăng nhập.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:block relative gradient-brand overflow-hidden">
        <div className="absolute inset-0 grid place-items-center p-12">
          <div className="text-white max-w-md">
            <Logo className="text-white [&_span]:!text-white" />
            <h2 className="mt-12 text-4xl font-display font-bold leading-tight">
              Chào mừng bạn quay lại hành trình tìm bạn cùng phòng.
            </h2>
            <p className="mt-4 text-white/85">
              Những người hợp với bạn đang chờ. Cuộc trò chuyện mới, cơ hội mới.
            </p>
            <div className="mt-12 grid grid-cols-3 gap-3">
              {["Linh", "Minh", "HaMy", "Khoa", "Trang", "Duy"].map((s, i) => (
                <div
                  key={s}
                  className="aspect-square rounded-2xl glass grid place-items-center text-3xl animate-float"
                  style={{ animationDelay: `${i * 0.3}s` }}
                >
                  <img
                    src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${s}&backgroundColor=ffffff`}
                    className="w-3/4"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <Heart className="absolute -bottom-20 -right-20 h-96 w-96 text-white/5" />
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md p-8 rounded-3xl border-0 shadow-lg lg:shadow-none lg:border-0">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>
          <h1 className="text-3xl font-display font-bold">Chào mừng trở lại 👋</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Đăng nhập để tìm bạn cùng phòng lý tưởng.
          </p>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const email = String(form.get("email") ?? "");
              const password = String(form.get("password") ?? "");
              void signIn(email, password);
            }}
          >
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="ban@truonghoc.edu.vn"
                className="mt-1.5 h-12 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="pw">Mật khẩu</Label>
              <Input
                id="pw"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="mt-1.5 h-12 rounded-xl"
              />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button disabled={busy} className="w-full h-12 rounded-xl bg-navy hover:bg-navy/90 text-white font-semibold">
              {busy ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="text-teal font-semibold hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
