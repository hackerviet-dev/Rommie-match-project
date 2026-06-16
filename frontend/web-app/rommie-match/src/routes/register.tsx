import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { makeMockUser, useAuthStore } from "@/stores/auth-store";

export default function Register() {
  const nav = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget.elements;
    const name = (form.namedItem("name") as HTMLInputElement)?.value;
    const email = (form.namedItem("email") as HTMLInputElement)?.value;
    login(makeMockUser(email || "ban@truonghoc.edu.vn", name));
    nav("/onboarding");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mint/20 via-background to-teal/10 p-4 sm:p-8 grid place-items-center">
      <Card className="w-full max-w-xl p-8 sm:p-10 rounded-3xl border-0 shadow-xl">
        <Logo />
        <h1 className="mt-6 text-3xl font-display font-bold">Tạo tài khoản</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Bắt đầu hành trình tìm bạn cùng phòng lý tưởng.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleRegister}>
          <div>
            <Label>Họ và tên</Label>
            <Input name="name" className="mt-1.5 h-11 rounded-xl" placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              name="email"
              type="email"
              className="mt-1.5 h-11 rounded-xl"
              placeholder="ban@truonghoc.edu.vn"
            />
          </div>
          <div>
            <Label>Mật khẩu</Label>
            <Input
              type="password"
              className="mt-1.5 h-11 rounded-xl"
              placeholder="Ít nhất 8 ký tự"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Giới tính</Label>
              <Select>
                <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                  <SelectValue placeholder="Chọn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="f">Nữ</SelectItem>
                  <SelectItem value="m">Nam</SelectItem>
                  <SelectItem value="nb">Phi nhị giới</SelectItem>
                  <SelectItem value="x">Không muốn nói</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tuổi</Label>
              <Input type="number" className="mt-1.5 h-11 rounded-xl" placeholder="22" />
            </div>
          </div>
          <div>
            <Label>Thành phố hiện tại</Label>
            <Select>
              <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                <SelectValue placeholder="Chọn thành phố" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hcmc">TP. Hồ Chí Minh</SelectItem>
                <SelectItem value="hn">Hà Nội</SelectItem>
                <SelectItem value="dn">Đà Nẵng</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full h-12 rounded-xl bg-navy hover:bg-navy/90 text-white font-semibold mt-2">
            Tạo tài khoản
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Khi đăng ký, bạn đồng ý với Điều khoản và Chính sách bảo mật.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link to="/login" className="text-teal font-semibold hover:underline">
            Đăng nhập
          </Link>
        </p>
      </Card>
    </div>
  );
}
