import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@/layouts/main-layout";
import { authApi, useAuthStore, loginSchema } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Heart } from "lucide-react";

export default function LoginPage() {
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const nav = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const health = useQuery({ queryKey: ["auth", "health"], queryFn: authApi.health, retry: false });
  const queryClient = useQueryClient();
  const signIn = useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => {
      queryClient.clear(); login(session);
      const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
      nav(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard");
    },
  });

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative gradient-brand overflow-hidden justify-center px-8 py-10 xl:p-12">
          <div className="relative z-10 w-full text-white max-w-md">
            <Logo className="text-white [&_span]:!text-white" />
            <Button asChild variant="ghost" className="mt-3 -ml-2 gap-2 rounded-xl px-2 text-white hover:bg-white/10 hover:text-white">
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
            <Button asChild variant="ghost" className="mt-4 -ml-2 gap-2 rounded-xl px-2 text-navy hover:bg-mint/30">
              <Link to="/">
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                Quay lại trang chủ
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-display font-bold">Chào mừng trở lại 👋</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Đăng nhập để tìm bạn cùng phòng lý tưởng.
          </p>

          {health.isError && <p role="status" className="mt-4 text-sm text-destructive">Không kết nối được máy chủ. Vui lòng thử lại sau.</p>}
          <form
            className="mt-8 space-y-4"
            onSubmit={form.handleSubmit(values => signIn.mutate(values))}
          >
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                {...form.register("email")} id="email" required autoComplete="email"
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
                {...form.register("password")} id="pw" required autoComplete="current-password"
                type="password"
                placeholder="••••••••"
                className="mt-1.5 h-12 rounded-xl"
              />
            </div>
            <Button disabled={signIn.isPending} className="w-full h-12 rounded-xl bg-navy hover:bg-navy/90 text-white font-semibold">
              {signIn.isPending ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
            {Object.values(form.formState.errors).map((error, i) => <p key={i} role="alert" className="text-sm text-destructive">{error.message}</p>)}
            {signIn.error && <p role="alert" className="text-sm text-destructive">{signIn.error.message}</p>}
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <span className="relative bg-card px-3 text-xs text-muted-foreground mx-auto block w-fit">
              HOẶC
            </span>
          </div>

          <Button
            variant="outline"
            className="w-full h-12 rounded-xl"
            disabled title="Đăng nhập Google chưa được hỗ trợ"
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Tiếp tục với Google
          </Button>

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
