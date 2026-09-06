import { useNavigate } from "react-router-dom";
import { useState, type ReactNode, type MouseEventHandler } from "react";
import { Logo } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";


function Pill({ active, onClick, children }: { active: boolean; onClick: MouseEventHandler<HTMLButtonElement>; children: ReactNode }) {
  return <button type="button" onClick={onClick}
    className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${active ? "bg-navy text-white border-navy shadow-md" : "bg-card hover:bg-muted"}`}>{children}</button>;
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  // Step 1
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [employment, setEmployment] = useState(""); // Đang đi học | Đang đi làm | Cả hai | Khác
  const [orgName, setOrgName] = useState(""); // school or workplace
  const [hideOrg, setHideOrg] = useState(false);
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  // Step 2
  const [sleep, setSleep] = useState("");
  const [env, setEnv] = useState("");
  const [yn, setYn] = useState<Record<string, string>>({});
  // Step 3
  const [hasRoom, setHasRoom] = useState<string>("");
  // Step 4 - has room
  const [addr, setAddr] = useState("");
  const [district, setDistrict] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [area, setArea] = useState("");
  const [rent, setRent] = useState("");
  const [needed, setNeeded] = useState("");
  const [moveIn, setMoveIn] = useState("");
  const [houseType, setHouseType] = useState("");
  const DEFAULT_AMENITIES = ["Máy lạnh", "Máy giặt", "Wi-Fi", "Bếp", "Ban công", "Bảo vệ 24/7", "Thang máy", "Chỗ để xe"];
  const [amenityOptions, setAmenityOptions] = useState<string[]>(DEFAULT_AMENITIES);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState("");
  // Step 4 - no room
  const [distance, setDistance] = useState("");
  const [roomType, setRoomType] = useState("");
  const [moveInDate, setMoveInDate] = useState("");

  const nav = useNavigate();
  const total = 4;

  const orgLabel = employment === "Đang đi học" ? "Trường học" : employment === "Đang đi làm" ? "Nơi làm việc" : employment === "Cả hai" ? "Trường / Nơi làm việc" : "Tổ chức (tuỳ chọn)";
  const orgRequired = employment === "Đang đi học" || employment === "Đang đi làm" || employment === "Cả hai";

  const canNext = (() => {
    if (step === 1) {
      if (!(name && age && gender && employment && city)) return false;
      if (orgRequired && !orgName) return false;
      return true;
    }
    if (step === 2) return sleep && env && yn.smoke && yn.drink && yn.pets;
    if (step === 3) return !!hasRoom;
    if (step === 4) {
      if (hasRoom === "yes") return addr && district && bedrooms && area && rent && needed && moveIn && houseType;
      return distance && roomType && moveInDate;
    }
    return false;
  })();

  const toggleAmenity = (a: string) =>
    setSelectedAmenities(s => s.includes(a) ? s.filter(x => x !== a) : [...s, a]);
  const addAmenity = () => {
    const v = newAmenity.trim();
    if (!v || amenityOptions.includes(v)) return;
    setAmenityOptions(o => [...o, v]);
    setSelectedAmenities(s => [...s, v]);
    setNewAmenity("");
  };
  const removeAmenity = (a: string) => {
    setAmenityOptions(o => o.filter(x => x !== a));
    setSelectedAmenities(s => s.filter(x => x !== a));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-mint/10 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6"><Logo /><span className="text-sm text-muted-foreground">Bước {step}/{total}</span></div>
        <Progress value={(step/total)*100} className="h-2 mb-8" />

        <Card className="p-8 sm:p-10 rounded-3xl border-0 shadow-lg">
          {step === 1 && (
            <>
              <h2 className="text-2xl font-display font-bold">Hãy giới thiệu bản thân</h2>
              <p className="text-muted-foreground text-sm mt-1">Vài thông tin để thiết lập hồ sơ.</p>
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                <div><Label>Họ và tên <span className="text-destructive">*</span></Label><Input value={name} onChange={e=>setName(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="Nguyễn Linh" /></div>
                <div><Label>Tuổi <span className="text-destructive">*</span></Label><Input value={age} onChange={e=>setAge(e.target.value)} type="number" className="mt-1.5 h-11 rounded-xl" placeholder="22" /></div>
                <div><Label>Giới tính <span className="text-destructive">*</span></Label><Input value={gender} onChange={e=>setGender(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="Nữ" /></div>
                <div><Label>Thành phố <span className="text-destructive">*</span></Label><Input value={city} onChange={e=>setCity(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="TP. Hồ Chí Minh" /></div>
                <div className="sm:col-span-2">
                  <Label>Tình trạng hiện tại <span className="text-destructive">*</span></Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Đang đi học","Đang đi làm","Cả hai","Khác"].map(o => <Pill key={o} active={employment===o} onClick={()=>{ setEmployment(o); setOrgName(""); }}>{o}</Pill>)}
                  </div>
                </div>
                {employment && employment !== "Khác" && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label>{orgLabel} {orgRequired && <span className="text-destructive">*</span>}</Label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={hideOrg} onChange={e=>setHideOrg(e.target.checked)} className="h-4 w-4 rounded" />
                        Ẩn khỏi hồ sơ
                      </label>
                    </div>
                    <Input value={orgName} onChange={e=>setOrgName(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder={employment === "Đang đi học" ? "VD: RMIT Việt Nam" : "VD: Công ty ABC"} />
                    {hideOrg && <p className="mt-1 text-xs text-muted-foreground">Thông tin này sẽ không hiển thị công khai trên hồ sơ.</p>}
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Label>Giới thiệu bản thân <span className="text-muted-foreground font-normal">(tuỳ chọn)</span></Label>
                  <textarea
                    value={bio}
                    onChange={e=>setBio(e.target.value.slice(0, 500))}
                    className="mt-1.5 w-full min-h-28 rounded-xl border bg-background p-3 text-sm"
                    placeholder="Một vài dòng giới thiệu về bạn, tính cách, sở thích, kỳ vọng về bạn cùng phòng..."
                  />
                  <div className="text-right text-xs text-muted-foreground mt-1">{bio.length}/500</div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-2xl font-display font-bold">Sở thích lối sống</h2>
              <p className="text-muted-foreground text-sm mt-1">Đây là nền tảng cho điểm hợp nhau của bạn.</p>
              <div className="mt-8 space-y-7">
                <div>
                  <Label>Bạn thường đi ngủ lúc mấy giờ? <span className="text-destructive">*</span></Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Trước 22h","22h–0h","Sau 0h"].map(o => <Pill key={o} active={sleep===o} onClick={()=>setSleep(o)}>{o}</Pill>)}
                  </div>
                </div>
                <div>
                  <Label>Bạn sạch sẽ ở mức nào? <span className="text-muted-foreground font-normal">(1 bừa → 5 sạch tinh)</span></Label>
                  <Slider defaultValue={[4]} max={5} min={1} step={1} className="mt-4" />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[["smoke","Có hút thuốc?"],["drink","Có uống rượu bia?"],["pets","Có nuôi thú cưng?"]].map(([k,l]) => (
                    <div key={k}>
                      <Label>{l} <span className="text-destructive">*</span></Label>
                      <div className="mt-2 flex gap-2">
                        {["Có","Không"].map(v => <Pill key={v} active={yn[k]===v} onClick={()=>setYn({...yn,[k]:v})}>{v}</Pill>)}
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <Label>Hướng nội ←→ Hướng ngoại</Label>
                  <Slider defaultValue={[60]} max={100} step={5} className="mt-4" />
                </div>
                <div>
                  <Label>Không gian phòng ưa thích <span className="text-destructive">*</span></Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Yên tĩnh","Vừa phải","Sôi nổi"].map(o => <Pill key={o} active={env===o} onClick={()=>setEnv(o)}>{o}</Pill>)}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-2xl font-display font-bold">Tình trạng chỗ ở</h2>
              <p className="text-muted-foreground text-sm mt-1">Bạn đã có phòng hay đang cần tìm phòng?</p>
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                <button type="button" onClick={()=>setHasRoom("yes")}
                  className={`text-left p-5 rounded-2xl border-2 transition-all ${hasRoom==="yes" ? "border-navy bg-navy/5 shadow-md" : "border-border hover:border-navy/40"}`}>
                  <div className="text-3xl">🏠</div>
                  <div className="mt-2 font-semibold">Mình đã có phòng</div>
                  <div className="text-sm text-muted-foreground mt-1">Chỉ cần tìm bạn cùng phòng phù hợp.</div>
                </button>
                <button type="button" onClick={()=>setHasRoom("no")}
                  className={`text-left p-5 rounded-2xl border-2 transition-all ${hasRoom==="no" ? "border-navy bg-navy/5 shadow-md" : "border-border hover:border-navy/40"}`}>
                  <div className="text-3xl">🔎</div>
                  <div className="mt-2 font-semibold">Mình đang tìm phòng</div>
                  <div className="text-sm text-muted-foreground mt-1">Tìm cả phòng lẫn bạn cùng phòng.</div>
                </button>
              </div>
            </>
          )}

          {step === 4 && hasRoom === "yes" && (
            <>
              <h2 className="text-2xl font-display font-bold">Thông tin phòng hiện tại</h2>
              <p className="text-muted-foreground text-sm mt-1">Giúp bạn cùng phòng tương lai hiểu rõ về chỗ ở của bạn.</p>
              <div className="mt-8 space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label>Địa chỉ <span className="text-destructive">*</span></Label><Input value={addr} onChange={e=>setAddr(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="123 Nguyễn Huệ" /></div>
                  <div><Label>Quận / Khu vực <span className="text-destructive">*</span></Label><Input value={district} onChange={e=>setDistrict(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="Quận 1, TP.HCM" /></div>
                  <div><Label>Số phòng ngủ <span className="text-destructive">*</span></Label><Input value={bedrooms} onChange={e=>setBedrooms(e.target.value)} type="number" className="mt-1.5 h-11 rounded-xl" placeholder="2" /></div>
                  <div><Label>Diện tích (m²) <span className="text-destructive">*</span></Label><Input value={area} onChange={e=>setArea(e.target.value)} type="number" className="mt-1.5 h-11 rounded-xl" placeholder="45" /></div>
                  <div><Label>Tiền thuê chia mỗi người (VND) <span className="text-destructive">*</span></Label><Input value={rent} onChange={e=>setRent(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="3.500.000" /></div>
                  <div><Label>Số người cần thêm <span className="text-destructive">*</span></Label><Input value={needed} onChange={e=>setNeeded(e.target.value)} type="number" className="mt-1.5 h-11 rounded-xl" placeholder="1" /></div>
                  <div><Label>Ngày có thể dọn vào <span className="text-destructive">*</span></Label><Input value={moveIn} onChange={e=>setMoveIn(e.target.value)} type="date" className="mt-1.5 h-11 rounded-xl" /></div>
                  <div>
                    <Label>Loại nhà <span className="text-destructive">*</span></Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {["Căn hộ","Nhà nguyên căn","Studio","Ký túc xá"].map(o => <Pill key={o} active={houseType===o} onClick={()=>setHouseType(o)}>{o}</Pill>)}
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Tiện nghi có sẵn <span className="text-muted-foreground font-normal">(chọn hoặc thêm mới)</span></Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {amenityOptions.map(o => {
                      const active = selectedAmenities.includes(o);
                      const isCustom = !DEFAULT_AMENITIES.includes(o);
                      return (
                        <span key={o} className={`group inline-flex items-center gap-1 rounded-xl border text-sm font-medium transition-all ${active ? "bg-navy text-white border-navy shadow-md" : "bg-card hover:bg-muted"}`}>
                          <button type="button" onClick={()=>toggleAmenity(o)} className="px-4 py-2.5">{o}</button>
                          {isCustom && (
                            <button type="button" onClick={()=>removeAmenity(o)} aria-label={`Xoá ${o}`} className={`pr-2 text-xs ${active ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-destructive"}`}>×</button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={newAmenity}
                      onChange={e=>setNewAmenity(e.target.value)}
                      onKeyDown={e=>{ if (e.key === "Enter") { e.preventDefault(); addAmenity(); } }}
                      className="h-10 rounded-xl"
                      placeholder="Thêm tiện nghi khác (VD: Hồ bơi)"
                    />
                    <Button type="button" onClick={addAmenity} variant="outline" className="rounded-xl">Thêm</Button>
                  </div>
                </div>
                <div>
                  <Label>Mô tả thêm về phòng</Label>
                  <textarea className="mt-1.5 w-full min-h-24 rounded-xl border bg-background p-3 text-sm" placeholder="Phòng thoáng, gần công viên, khu yên tĩnh..." />
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
                  <Slider defaultValue={[3,7]} max={15} min={1} step={1} className="mt-4" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2"><span>3 triệu</span><span>7 triệu</span></div>
                </div>
                <div>
                  <Label>Khoảng cách mong muốn <span className="text-destructive">*</span></Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["< 2 km","2–5 km","5–10 km","Bất kỳ đâu trong thành phố"].map(o => <Pill key={o} active={distance===o} onClick={()=>setDistance(o)}>{o}</Pill>)}
                  </div>
                </div>
                <div>
                  <Label>Loại phòng <span className="text-destructive">*</span></Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Phòng riêng","Phòng chung","Studio","Cả căn hộ"].map(o => <Pill key={o} active={roomType===o} onClick={()=>setRoomType(o)}>{o}</Pill>)}
                  </div>
                </div>
                <div>
                  <Label>Ngày dọn vào <span className="text-destructive">*</span></Label>
                  <Input value={moveInDate} onChange={e=>setMoveInDate(e.target.value)} type="date" className="mt-1.5 h-11 rounded-xl" />
                </div>
              </div>
            </>
          )}

          {!canNext && (
            <p className="mt-6 text-xs text-muted-foreground text-right">Vui lòng hoàn tất các mục bắt buộc (*) để tiếp tục.</p>
          )}

          <div className="mt-4 flex justify-between gap-3">
            <Button variant="ghost" disabled={step===1} onClick={()=>setStep(s=>s-1)} className="rounded-xl"><ArrowLeft className="h-4 w-4 mr-2" /> Quay lại</Button>
            <Button onClick={()=> step<total ? setStep(s=>s+1) : nav("/quiz")} disabled={!canNext} className="rounded-xl bg-navy hover:bg-navy/90 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed">
              {step < total ? "Tiếp tục" : "Làm trắc nghiệm"} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
