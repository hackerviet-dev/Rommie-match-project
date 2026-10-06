import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@/layouts/main-layout";
import {
  authApi,
  GoogleSignIn,
  useAuthStore,
  loginSchema,
  getLoginDestination,
  notifyLoginSuccess,
} from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Heart } from "lucide-react";

export default function LoginPage() {
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const nav = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const health = useQuery({
    queryKey: ["auth", "health"],
    queryFn: authApi.health,
    retry: false,
  });
  const queryClient = useQueryClient();
  const signIn = useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => {
      queryClient.clear();
      login(session);
      notifyLoginSuccess(session.user);
      const returnTo = (location.state as { returnTo?: string } | null)
        ?.returnTo;
      nav(getLoginDestination(session.user.role, returnTo), { replace: true });
    },
  });

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative gradient-brand overflow-hidden justify-center px-8 py-10 xl:p-12">
        <div className="relative z-10 w-full text-white max-w-md">
          <Logo className="text-white [&_span]:!text-white" />
          <Button
            asChild
            variant="ghost"
            className="mt-3 -ml-2 gap-2 rounded-xl px-2 text-white hover:bg-white/10 hover:text-white"
          >
            <Link to="/">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              Quay lại trang chủ
            </Link>
          </Button>
          <h2 className="mt-6 text-4xl font-display font-bold leading-tight">
            Chào mừng bạn quay lại hành trình tìm bạn cùng phòng.
          </h2>
          <div className="mt-6 grid w-full max-w-[360px] grid-cols-3 gap-3">
            {["Linh", "Minh", "HaMy", "Khoa", "Trang", "Duy"].map((s, i) => (
              <div
                key={s}
                className="aspect-square rounded-2xl glass grid place-items-center text-3xl animate-float"
                style={{ animationDelay: `${i * 0.3}s` }}
              >
                <img
                  alt={`Ảnh đại diện minh họa ${s}`}
                  src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${s}&backgroundColor=ffffff`}
                  className="w-3/4"
                />
              </div>
            ))}
          </div>
        </div>
        <Heart className="absolute -bottom-20 -right-20 h-96 w-96 text-white/5" />
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md p-8 rounded-3xl border-0 shadow-lg lg:shadow-none lg:border-0">
          <div className="lg:hidden mb-8">
            <Logo />
            <Button
              asChild
              variant="ghost"
              className="mt-4 -ml-2 gap-2 rounded-xl px-2 text-navy hover:bg-mint/30"
            >
              <Link to="/">
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                Quay lại trang chủ
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-display font-bold">
            Chào mừng trở lại 👋
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Đăng nhập để tìm bạn cùng phòng lý tưởng.
          </p>

          {health.isError && (
            <p role="status" className="mt-4 text-sm text-destructive">
              Không kết nối được máy chủ. Vui lòng thử lại sau.
            </p>
          )}
          <form
            className="mt-8 space-y-4"
            onSubmit={form.handleSubmit((values) => signIn.mutate(values))}
          >
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                {...form.register("email")}
                id="email"
                required
                autoComplete="email"
                type="email"
                placeholder="ban@truonghoc.edu.vn"
                className="mt-1.5 h-12 rounded-xl"
              />
            </div>
            <div>
              <div className="flex justify-between">
                <Label htmlFor="pw">Mật khẩu</Label>
                <a href="#" className="text-xs text-teal hover:underline">
                  Quên?
                </a>
              </div>
              <Input
                {...form.register("password")}
                id="pw"
                required
                autoComplete="current-password"
                type="password"
                placeholder="••••••••"
                className="mt-1.5 h-12 rounded-xl"
              />
            </div>
            <Button
              disabled={signIn.isPending}
              className="w-full h-12 rounded-xl bg-navy hover:bg-navy/90 text-white font-semibold"
            >
              {signIn.isPending ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
            {Object.values(form.formState.errors).map((error, i) => (
              <p key={i} role="alert" className="text-sm text-destructive">
                {error.message}
              </p>
            ))}
            {signIn.error && (
              <p role="alert" className="text-sm text-destructive">
                {signIn.error.message}
              </p>
            )}
          </form>
          <GoogleSignIn />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link
              to="/register"
              className="text-teal font-semibold hover:underline"
            >
              Đăng ký ngay
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
