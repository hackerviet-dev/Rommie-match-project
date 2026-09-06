import { Link, useParams } from "react-router-dom";
import { AppShell, CompatRing } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { roommates } from "@/lib/mock-data";
import { isSaved, toggleSaved } from "@/lib/saved-profiles";
import { MessageCircle, Bookmark, BookmarkCheck, Flag, MapPin, Calendar, Briefcase, Wallet, ShieldAlert, CheckCircle2 } from "lucide-react";


const REPORT_REASONS = [
  { id: "fake", label: "Hồ sơ giả mạo / mạo danh", desc: "Ảnh, tên hoặc thông tin không có thật." },
  { id: "scam", label: "Lừa đảo / yêu cầu chuyển tiền", desc: "Đòi đặt cọc bất thường, dẫn dụ ra ngoài nền tảng." },
  { id: "harass", label: "Quấy rối / ngôn từ thù ghét", desc: "Tin nhắn xúc phạm, kỳ thị, đe doạ." },
  { id: "sexual", label: "Nội dung khiêu dâm / không phù hợp", desc: "Hình ảnh hoặc tin nhắn mang tính tình dục." },
  { id: "spam", label: "Spam / quảng cáo", desc: "Gửi quảng cáo, link lạ, dịch vụ ngoài luồng." },
  { id: "underage", label: "Nghi ngờ chưa đủ tuổi", desc: "Người dùng có dấu hiệu dưới 18 tuổi." },
  { id: "other", label: "Lý do khác", desc: "Mô tả chi tiết ở phần bên dưới." },
];

export default function Profile() {
  const { id } = useParams();
  const r = roommates.find(x => x.id === id) ?? roommates[0];
  const [saved, setSaved] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [blockUser, setBlockUser] = useState(true);
  const [hideProfile, setHideProfile] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(isSaved(r.id));
    sync();
    window.addEventListener("saved-profiles-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("saved-profiles-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [r.id]);

  const handleSave = () => {
    try {
    const now = toggleSaved(r.id);
    setSaved(now);
    toast.success(now ? `Đã lưu hồ sơ ${r.name}` : `Đã bỏ lưu hồ sơ ${r.name}`);
    } catch { toast.error("Không thể lưu hồ sơ trên trình duyệt này."); }
  };

  const submitReport = () => {
    if (!reason) {
      toast.error("Vui lòng chọn một lý do báo cáo");
      return;
    }
    if (reason === "other" && details.trim().length < 10) {
      toast.error("Vui lòng mô tả chi tiết (ít nhất 10 ký tự)");
      return;
    }
    toast.info("Tính năng gửi báo cáo đang được hoàn thiện. Báo cáo chưa được gửi và người dùng chưa bị chặn.");
  };

  const closeReport = () => {
    setReportOpen(false);
    setTimeout(() => {
      setReason(""); setDetails(""); setBlockUser(true); setHideProfile(false);
    }, 200);
  };

  return (
    <AppShell>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-0 shadow-sm overflow-hidden lg:sticky lg:top-24 self-start">
          <div className="h-32 gradient-brand" />
          <div className="px-6 pb-6 -mt-12">
            <img src={r.avatar} className="h-28 w-28 rounded-3xl ring-4 ring-card bg-mint/30" />
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <div className="font-display font-bold text-2xl">{r.name}</div>
                <div className="text-sm text-muted-foreground">{r.age} · {r.occupation}</div>
              </div>
              <CompatRing score={r.score} size={64} />
            </div>

            <div className="mt-5 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {r.city}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Briefcase className="h-4 w-4" /> {r.occupation}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Wallet className="h-4 w-4" /> {r.budget} / tháng</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /> Dọn vào {r.moveIn}</div>
            </div>

            <div className="mt-6 space-y-2">
              <Link to="/chat"><Button className="w-full rounded-xl bg-navy hover:bg-navy/90 text-white"><MessageCircle className="h-4 w-4 mr-2" /> Nhắn tin</Button></Link>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className={`rounded-xl ${saved ? "bg-mint/20 border-mint text-navy" : ""}`} onClick={handleSave}>
                  {saved ? <><BookmarkCheck className="h-4 w-4 mr-2" /> Đã lưu</> : <><Bookmark className="h-4 w-4 mr-2" /> Lưu</>}
                </Button>
                <Button variant="outline" className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setReportOpen(true)}><Flag className="h-4 w-4 mr-2" /> Báo cáo</Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 rounded-3xl border-0 shadow-sm">
            <h3 className="font-display font-bold text-lg">Phân tích độ hợp nhau</h3>
            <p className="text-sm text-muted-foreground">Dựa trên trắc nghiệm và sở thích lối sống của bạn.</p>
            <div className="mt-5 space-y-4">
              {r.breakdown.map(b => (
                <div key={b.label}>
                  <div className="flex justify-between text-sm mb-1.5"><span className="font-medium">{b.label}</span><span className="font-bold text-navy">{b.value}%</span></div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden"><div className="h-full gradient-brand rounded-full" style={{width:`${b.value}%`}} /></div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 rounded-3xl border-0 shadow-sm">
            <h3 className="font-display font-bold text-lg">Giới thiệu</h3>
            <p className="mt-3 text-foreground/90 leading-relaxed">{r.bio}</p>
          </Card>

          <Card className="p-6 rounded-3xl border-0 shadow-sm">
            <h3 className="font-display font-bold text-lg">Sở thích & đam mê</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {r.interests.map(i => (
                <Badge key={i} className="rounded-full bg-mint/30 text-navy border-0 hover:bg-mint/40 px-3 py-1.5">{i}</Badge>
              ))}
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="p-6 rounded-3xl border-0 shadow-sm">
              <h3 className="font-display font-bold text-lg">Mong muốn nơi ở</h3>
              <ul className="mt-3 text-sm space-y-2 text-muted-foreground">
                <li>· Tìm: phòng riêng hoặc 2PN chung</li>
                <li>· Cách trung tâm: dưới 5 km</li>
                <li>· Hợp đồng: 12 tháng trở lên</li>
                <li>· Không hút thuốc trong nhà</li>
              </ul>
            </Card>
            <Card className="p-6 rounded-3xl border-0 shadow-sm">
              <h3 className="font-display font-bold text-lg">Mức độ hoạt động</h3>
              <div className="mt-3 text-sm text-muted-foreground">Hoạt động trong 24h qua</div>
              <div className="mt-2 text-sm">Thường trả lời trong <span className="font-semibold text-foreground">dưới 1 giờ</span></div>
              <div className="mt-4 flex gap-1.5">
                {Array.from({length: 14}).map((_,i)=>(
                  <div key={i} className={`h-6 flex-1 rounded ${[2,3,5,6,8,9,10,12,13].includes(i)?"bg-teal":"bg-muted"}`} />
                ))}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Hoạt động 2 tuần qua</div>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={reportOpen} onOpenChange={(o) => (o ? setReportOpen(true) : closeReport())}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" /> Báo cáo {r.name}
                </DialogTitle>
                <DialogDescription>
                  Chọn lý do và mô tả sự việc. Tính năng gửi báo cáo và chặn người dùng chưa được kết nối.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Lý do báo cáo</Label>
                  <RadioGroup value={reason} onValueChange={setReason} className="mt-2 space-y-1.5">
                    {REPORT_REASONS.map(r => (
                      <label key={r.id} htmlFor={`reason-${r.id}`} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${reason === r.id ? "border-navy bg-mint/10" : "border-border hover:bg-muted/40"}`}>
                        <RadioGroupItem id={`reason-${r.id}`} value={r.id} className="mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{r.label}</div>
                          <div className="text-xs text-muted-foreground">{r.desc}</div>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Mô tả chi tiết {reason === "other" && <span className="text-destructive">*</span>}</Label>
                  <Textarea
                    className="mt-1.5 rounded-xl min-h-24"
                    placeholder="Cung cấp thêm bối cảnh, đường dẫn tin nhắn hoặc thời điểm sự việc xảy ra để chúng tôi xử lý nhanh hơn."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    maxLength={1000}
                  />
                  <div className="text-xs text-muted-foreground mt-1 text-right">{details.length}/1000</div>
                </div>

                <div className="space-y-2 p-3 rounded-xl bg-muted/40">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox checked={blockUser} onCheckedChange={(v) => setBlockUser(!!v)} className="mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Chặn người dùng này</div>
                      <div className="text-xs text-muted-foreground">Họ sẽ không thể nhắn tin hoặc thấy hồ sơ của bạn.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox checked={hideProfile} onCheckedChange={(v) => setHideProfile(!!v)} className="mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Ẩn các hồ sơ tương tự</div>
                      <div className="text-xs text-muted-foreground">Giảm xuất hiện những hồ sơ có đặc điểm giống.</div>
                    </div>
                  </label>
                </div>

                <p className="text-xs text-muted-foreground">
                  Báo cáo sai sự thật có thể dẫn tới hạn chế tài khoản của bạn. Vui lòng xem
                  <Link to="/community-guidelines" className="text-navy underline ml-1">Quy tắc cộng đồng</Link>.
                </p>
              </div>

              <DialogFooter className="mt-4 gap-2">
                <Button variant="outline" className="rounded-xl" onClick={closeReport}>Huỷ</Button>
                <Button className="rounded-xl bg-destructive hover:bg-destructive/90 text-white" onClick={submitReport}>
                  <Flag className="h-4 w-4 mr-2" /> Gửi báo cáo
                </Button>
              </DialogFooter>
            </>
</DialogContent>
      </Dialog>
    </AppShell>
  );
}
