import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/app-shell";
import { makeMockUser, useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const login = useAuthStore((s) => s.login);

  const signIn = (email: string) => {
    login(makeMockUser(email || "ban@truonghoc.edu.vn"));
    nav("/dashboard");
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
              const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement)
                ?.value;
              signIn(email);
            }}
          >
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
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
                id="pw"
                type="password"
                placeholder="••••••••"
                className="mt-1.5 h-12 rounded-xl"
              />
            </div>
            <Button className="w-full h-12 rounded-xl bg-navy hover:bg-navy/90 text-white font-semibold">
              Đăng nhập
            </Button>
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
            onClick={() => signIn("ban@truonghoc.edu.vn")}
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
