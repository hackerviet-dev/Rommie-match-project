import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Logo } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { MouseEventHandler, ReactNode } from "react";

type PillProps = {
  active: boolean;
  children: ReactNode;
  onClick: MouseEventHandler<HTMLButtonElement>;
};

function Pill({ active, onClick, children }: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${active ? "bg-navy text-white border-navy shadow-md" : "bg-card hover:bg-muted"}`}
    >
      {children}
    </button>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [sleep, setSleep] = useState("");
  const [env, setEnv] = useState("");
  const [yn, setYn] = useState<Record<string, string>>({});
  const [hasRoom, setHasRoom] = useState<string>("");
  const nav = useNavigate();
  const total = 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-mint/10 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Logo />
          <span className="text-sm text-muted-foreground">
            Bước {step}/{total}
          </span>
        </div>
        <Progress value={(step / total) * 100} className="h-2 mb-8" />

        <Card className="p-8 sm:p-10 rounded-3xl border-0 shadow-lg">
          {step === 1 && (
            <>
              <h2 className="text-2xl font-display font-bold">Hãy giới thiệu bản thân</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Vài thông tin để thiết lập hồ sơ.
              </p>
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Họ và tên</Label>
                  <Input className="mt-1.5 h-11 rounded-xl" placeholder="Nguyễn Linh" />
                </div>
                <div>
                  <Label>Tuổi</Label>
                  <Input type="number" className="mt-1.5 h-11 rounded-xl" placeholder="22" />
                </div>
                <div>
                  <Label>Giới tính</Label>
                  <Input className="mt-1.5 h-11 rounded-xl" placeholder="Nữ" />
                </div>
                <div>
                  <Label>Nghề nghiệp</Label>
                  <Input className="mt-1.5 h-11 rounded-xl" placeholder="Nhà thiết kế UX" />
                </div>
                <div>
                  <Label>Trường học (tuỳ chọn)</Label>
                  <Input className="mt-1.5 h-11 rounded-xl" placeholder="RMIT Việt Nam" />
                </div>
                <div>
                  <Label>Thành phố</Label>
                  <Input className="mt-1.5 h-11 rounded-xl" placeholder="TP. Hồ Chí Minh" />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-2xl font-display font-bold">Sở thích lối sống</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Đây là nền tảng cho điểm hợp nhau của bạn.
              </p>
              <div className="mt-8 space-y-7">
                <div>
                  <Label>Bạn thường đi ngủ lúc mấy giờ?</Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Trước 22h", "22h–0h", "Sau 0h"].map((o) => (
                      <Pill key={o} active={sleep === o} onClick={() => setSleep(o)}>
                        {o}
                      </Pill>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>
                    Bạn sạch sẽ ở mức nào?{" "}
                    <span className="text-muted-foreground font-normal">(1 bừa → 5 sạch tinh)</span>
                  </Label>
                  <Slider defaultValue={[4]} max={5} min={1} step={1} className="mt-4" />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    ["smoke", "Có hút thuốc?"],
                    ["drink", "Có uống rượu bia?"],
                    ["pets", "Có nuôi thú cưng?"],
                  ].map(([k, l]) => (
                    <div key={k}>
                      <Label>{l}</Label>
                      <div className="mt-2 flex gap-2">
                        {["Có", "Không"].map((v) => (
                          <Pill
                            key={v}
                            active={yn[k] === v}
                            onClick={() => setYn({ ...yn, [k]: v })}
                          >
                            {v}
                          </Pill>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <Label>Hướng nội ←→ Hướng ngoại</Label>
                  <Slider defaultValue={[60]} max={100} step={5} className="mt-4" />
                </div>
                <div>
                  <Label>Không gian phòng ưa thích</Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Yên tĩnh", "Vừa phải", "Sôi nổi"].map((o) => (
                      <Pill key={o} active={env === o} onClick={() => setEnv(o)}>
                        {o}
                      </Pill>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-2xl font-display font-bold">Tình trạng chỗ ở</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Bạn đã có phòng hay đang cần tìm phòng?
              </p>
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setHasRoom("yes")}
                  className={`text-left p-5 rounded-2xl border-2 transition-all ${hasRoom === "yes" ? "border-navy bg-navy/5 shadow-md" : "border-border hover:border-navy/40"}`}
                >
                  <div className="text-3xl">🏠</div>
                  <div className="mt-2 font-semibold">Mình đã có phòng</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Chỉ cần tìm bạn cùng phòng phù hợp.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setHasRoom("no")}
                  className={`text-left p-5 rounded-2xl border-2 transition-all ${hasRoom === "no" ? "border-navy bg-navy/5 shadow-md" : "border-border hover:border-navy/40"}`}
                >
                  <div className="text-3xl">🔎</div>
                  <div className="mt-2 font-semibold">Mình đang tìm phòng</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Tìm cả phòng lẫn bạn cùng phòng.
                  </div>
                </button>
              </div>
            </>
          )}

          {step === 4 && hasRoom === "yes" && (
            <>
              <h2 className="text-2xl font-display font-bold">Thông tin phòng hiện tại</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Giúp bạn cùng phòng tương lai hiểu rõ về chỗ ở của bạn.
              </p>
              <div className="mt-8 space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Địa chỉ</Label>
                    <Input className="mt-1.5 h-11 rounded-xl" placeholder="123 Nguyễn Huệ" />
                  </div>
                  <div>
                    <Label>Quận / Khu vực</Label>
                    <Input className="mt-1.5 h-11 rounded-xl" placeholder="Quận 1, TP.HCM" />
                  </div>
                  <div>
                    <Label>Số phòng ngủ</Label>
                    <Input type="number" className="mt-1.5 h-11 rounded-xl" placeholder="2" />
                  </div>
                  <div>
                    <Label>Diện tích (m²)</Label>
                    <Input type="number" className="mt-1.5 h-11 rounded-xl" placeholder="45" />
                  </div>
                  <div>
                    <Label>Tiền thuê chia mỗi người (VND)</Label>
                    <Input className="mt-1.5 h-11 rounded-xl" placeholder="3.500.000" />
                  </div>
                  <div>
                    <Label>Số người cần thêm</Label>
                    <Input type="number" className="mt-1.5 h-11 rounded-xl" placeholder="1" />
                  </div>
                  <div>
                    <Label>Ngày có thể dọn vào</Label>
                    <Input type="date" className="mt-1.5 h-11 rounded-xl" />
                  </div>
                  <div>
                    <Label>Loại nhà</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {["Căn hộ", "Nhà nguyên căn", "Studio", "Ký túc xá"].map((o) => (
                        <Pill key={o}>{o}</Pill>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Tiện nghi có sẵn</Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      "Máy lạnh",
                      "Máy giặt",
                      "Wi-Fi",
                      "Bếp",
                      "Ban công",
                      "Bảo vệ 24/7",
                      "Thang máy",
                      "Chỗ để xe",
                    ].map((o) => (
                      <Pill key={o}>{o}</Pill>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Mô tả thêm về phòng</Label>
                  <textarea
                    className="mt-1.5 w-full min-h-24 rounded-xl border bg-background p-3 text-sm"
                    placeholder="Phòng thoáng, gần công viên, khu yên tĩnh..."
                  />
                </div>
              </div>
            </>
          )}

          {step === 4 && hasRoom !== "yes" && (
            <>
              <h2 className="text-2xl font-display font-bold">Ngân sách & phòng mong muốn</h2>
              <p className="text-muted-foreground text-sm mt-1">Bước cuối — gần xong rồi.</p>
              <div className="mt-8 space-y-6">
                <div>
                  <Label>Ngân sách hàng tháng (VND)</Label>
                  <Slider defaultValue={[3, 7]} max={15} min={1} step={1} className="mt-4" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>3 triệu</span>
                    <span>7 triệu</span>
                  </div>
                </div>
                <div>
                  <Label>Khoảng cách mong muốn</Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["< 2 km", "2–5 km", "5–10 km", "Bất kỳ đâu trong thành phố"].map((o) => (
                      <Pill key={o}>{o}</Pill>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Loại phòng</Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Phòng riêng", "Phòng chung", "Studio", "Cả căn hộ"].map((o) => (
                      <Pill key={o}>{o}</Pill>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Ngày dọn vào</Label>
                  <Input type="date" className="mt-1.5 h-11 rounded-xl" />
                </div>
              </div>
            </>
          )}

          <div className="mt-10 flex justify-between gap-3">
            <Button
              variant="ghost"
              disabled={step === 1}
              onClick={() => setStep((s) => s - 1)}
              className="rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại
            </Button>
            <Button
              onClick={() => (step < total ? setStep((s) => s + 1) : nav("/quiz"))}
              disabled={step === 3 && !hasRoom}
              className="rounded-xl bg-navy hover:bg-navy/90 text-white px-6 disabled:opacity-50"
            >
              {step < total ? "Tiếp tục" : "Làm trắc nghiệm"}{" "}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
