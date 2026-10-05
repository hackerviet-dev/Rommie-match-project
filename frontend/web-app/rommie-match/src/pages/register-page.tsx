import { useForm } from "react-hook-form";
import { GoogleSignIn } from "@/features/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { authApi, useAuthStore, registerSchema } from "@/features/auth";
import { useState } from "react";
import { Logo } from "@/layouts/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { VN_LOCATIONS } from "@/constants/locations";
import { ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const form = useForm({ resolver: zodResolver(registerSchema), defaultValues: { email: "", password: "", displayName: "", city: "" } });
  const nav = useNavigate();
  const login = useAuthStore(s => s.login);
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");

  const queryClient = useQueryClient();
  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: (session) => { queryClient.clear(); login(session); nav("/onboarding"); },
  });
  const canSubmit = gender && city;

  function handleBack() {
    if (typeof window.history.state?.idx === "number" && window.history.state.idx > 0) {
      nav(-1);
    } else {
      nav("/");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mint/20 via-background to-teal/10 p-4 pl-28 sm:p-8 sm:pl-28 lg:p-8 grid place-items-center">
      <Card className="relative w-full max-w-xl p-8 sm:p-10 rounded-3xl border-0 shadow-xl">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            aria-label="Quay lại"
            title="Quay lại"
            className="absolute right-full mr-2 top-8 sm:top-10 gap-2 px-2 rounded-xl text-navy hover:bg-mint/30"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Quay lại
          </Button>
        <Logo />
        <h1 className="mt-6 text-3xl font-display font-bold">Tạo tài khoản</h1>
        <p className="mt-2 text-muted-foreground text-sm">Bắt đầu hành trình tìm bạn cùng phòng lý tưởng.</p>

        <form className="mt-8 space-y-4" onSubmit={form.handleSubmit(values => {
          if (!canSubmit || register.isPending) return;
          register.mutate({ ...values, gender: ({ m: "male", f: "female", o: "other", x: null } as Record<string, string | null>)[gender] });
        })}>
          <div>
            <Label>Họ và tên</Label>
            <Input {...form.register("displayName")} required minLength={2} maxLength={120} className="mt-1.5 h-11 rounded-xl" placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <Label>Email</Label>
            <Input {...form.register("email")} required type="email" className="mt-1.5 h-11 rounded-xl" placeholder="ban@truonghoc.edu.vn" />
          </div>
          <div>
            <Label>Mật khẩu</Label>
            <Input {...form.register("password")} required minLength={8} maxLength={200} type="password" className="mt-1.5 h-11 rounded-xl" placeholder="Ít nhất 8 ký tự" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Giới tính của bạn <span className="text-destructive">*</span></Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="mt-1.5 h-11 rounded-xl"><SelectValue placeholder="Chọn" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="m">Nam</SelectItem>
                  <SelectItem value="f">Nữ</SelectItem>
                  <SelectItem value="o">Khác</SelectItem>
                  <SelectItem value="x">Không muốn tiết lộ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Thành phố / Tỉnh hiện tại <span className="text-destructive">*</span></Label>
            <Select value={city} onValueChange={value => { setCity(value); form.setValue("city", value, { shouldValidate: true }); }}>
              <SelectTrigger className="mt-1.5 h-11 rounded-xl"><SelectValue placeholder="Chọn thành phố hoặc tỉnh" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {VN_LOCATIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit || register.isPending}
            className="w-full h-12 rounded-xl bg-navy hover:bg-navy/90 text-white font-semibold mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {register.isPending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
          </Button>
          {Object.values(form.formState.errors).map((error, i) => <p key={i} role="alert" className="text-sm text-destructive">{error.message}</p>)}
          {register.error && <p role="alert" className="text-sm text-destructive">{register.error.message}</p>}
          {!canSubmit && (
            <p className="text-center text-xs text-muted-foreground">
              Vui lòng chọn giới tính và thành phố để tiếp tục.
            </p>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Khi đăng ký, bạn đồng ý với Điều khoản và Chính sách bảo mật.
          </p>
        </form>
        <GoogleSignIn />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Đã có tài khoản? <Link to="/login" className="text-teal font-semibold hover:underline">Đăng nhập</Link>
        </p>
      </Card>
    </div>
  );
}
