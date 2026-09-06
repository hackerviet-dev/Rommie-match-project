import { Link, useNavigate } from "react-router-dom";
import { makeMockUser, useAuthStore } from "@/stores/auth-store";
import { useState } from "react";
import { Logo } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";


const VN_LOCATIONS = [
  "TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  "An Giang", "Bà Rịa - Vũng Tàu", "Bạc Liêu", "Bắc Giang", "Bắc Kạn",
  "Bắc Ninh", "Bến Tre", "Bình Dương", "Bình Định", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk", "Đắk Nông",
  "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang",
  "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình",
  "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu",
  "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định",
  "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên",
  "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị",
  "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên",
  "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang",
  "Vĩnh Long", "Vĩnh Phúc", "Yên Bái",
];

export default function Register() {
  const nav = useNavigate();
  const login = useAuthStore(s => s.login);
  const [gender, setGender] = useState("");
  const [prefer, setPrefer] = useState("");
  const [city, setCity] = useState("");

  const canSubmit = gender && prefer && city;

  return (
    <div className="min-h-screen bg-gradient-to-br from-mint/20 via-background to-teal/10 p-4 sm:p-8 grid place-items-center">
      <Card className="w-full max-w-xl p-8 sm:p-10 rounded-3xl border-0 shadow-xl">
        <Logo />
        <h1 className="mt-6 text-3xl font-display font-bold">Tạo tài khoản</h1>
        <p className="mt-2 text-muted-foreground text-sm">Bắt đầu hành trình tìm bạn cùng phòng lý tưởng.</p>

        <form className="mt-8 space-y-4" onSubmit={(e)=>{e.preventDefault(); if (!canSubmit) return; const form = new FormData(e.currentTarget); login(makeMockUser(String(form.get("email")), String(form.get("name")))); nav("/onboarding");}}>
          <div>
            <Label>Họ và tên</Label>
            <Input name="name" required className="mt-1.5 h-11 rounded-xl" placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <Label>Email</Label>
            <Input name="email" required type="email" className="mt-1.5 h-11 rounded-xl" placeholder="ban@truonghoc.edu.vn" />
          </div>
          <div>
            <Label>Mật khẩu</Label>
            <Input name="password" required minLength={8} type="password" className="mt-1.5 h-11 rounded-xl" placeholder="Ít nhất 8 ký tự" />
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
            <div>
              <Label>Tuổi</Label>
              <Input type="number" className="mt-1.5 h-11 rounded-xl" placeholder="22" />
            </div>
          </div>
          <div>
            <Label>Bạn muốn ở cùng với <span className="text-destructive">*</span></Label>
            <Select value={prefer} onValueChange={setPrefer}>
              <SelectTrigger className="mt-1.5 h-11 rounded-xl"><SelectValue placeholder="Chọn đối tượng" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="m">Chỉ nam</SelectItem>
                <SelectItem value="f">Chỉ nữ</SelectItem>
                <SelectItem value="mf">Nam hoặc nữ</SelectItem>
                <SelectItem value="any">Không quan trọng</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Thành phố / Tỉnh hiện tại <span className="text-destructive">*</span></Label>
            <Select value={city} onValueChange={setCity}>
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
            disabled={!canSubmit}
            className="w-full h-12 rounded-xl bg-navy hover:bg-navy/90 text-white font-semibold mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Tạo tài khoản
          </Button>
          {!canSubmit && (
            <p className="text-center text-xs text-muted-foreground">
              Vui lòng chọn giới tính, đối tượng muốn ở cùng và thành phố để tiếp tục.
            </p>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Khi đăng ký, bạn đồng ý với Điều khoản và Chính sách bảo mật.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Đã có tài khoản? <Link to="/login" className="text-teal font-semibold hover:underline">Đăng nhập</Link>
        </p>
      </Card>
    </div>
  );
}
