import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tokenStorage } from "@/services/token-storage";
import { roommates } from "@/mocks/data/mock-data";
import { getSaved, removeSaved, profileApi } from "@/features/profile";
import { toast } from "sonner";
import { Bookmark, MessageCircle, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/layouts/main-layout";
import { authApi, useAuthStore } from "@/features/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Bell,
  Shield,
  Lock,
  Moon,
  Globe,
  LogOut,
  MapPin,
  Briefcase,
  Calendar,
  CheckCircle2,
  Cake,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { lifestyleApi } from "@/features/lifestyle/services/lifestyle-api";
import { billingApi } from "@/features/billing/services/billing-api";
import { ApiError } from "@/services/api-error";
import { SettingsProfileEditor } from "./settings-profile-editor";

function Section({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6 rounded-3xl border-0 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-mint/30 grid place-items-center text-navy shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </Card>
  );
}

function SavedProfiles() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(getSaved());
    sync();
    window.addEventListener("saved-profiles-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("saved-profiles-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const items = ids
    .map(id => roommates.find(r => r.id === id))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const handleRemove = (id: string, name: string) => {
    try {
    removeSaved(id);
    toast.success(`Đã bỏ lưu ${name}`);
    } catch { toast.error("Không thể cập nhật hồ sơ đã lưu trên trình duyệt này."); }
  };

  return (
    <Section icon={Bookmark} title="Đã lưu" desc={`${items.length} hồ sơ bạn đã lưu để xem lại sau.`}>
      {items.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-2xl bg-muted/30 border border-dashed">
          <div className="mx-auto h-12 w-12 rounded-full bg-mint/30 grid place-items-center text-navy">
            <Search className="h-6 w-6" />
          </div>
          <div className="mt-3 text-sm font-medium">Chưa có hồ sơ nào được lưu</div>
          <p className="text-xs text-muted-foreground mt-1">Bấm nút <Bookmark className="h-3 w-3 inline" /> Lưu trên trang hồ sơ để xem lại tại đây.</p>
          <Link to="/matches">
            <Button variant="outline" size="sm" className="mt-4 rounded-xl">Khám phá hồ sơ</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl border hover:bg-muted/30 transition">
              <img src={r.avatar} alt={r.name} className="h-12 w-12 rounded-xl bg-mint/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium truncate">{r.name}</div>
                  <Badge className="rounded-full bg-mint/30 text-navy border-0 text-[10px] px-1.5 py-0">{r.score}%</Badge>
                </div>
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.city} · {r.occupation}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Link to={`/profile/${r.id}`}>
                  <Button variant="outline" size="sm" className="rounded-lg h-8">Xem</Button>
                </Link>
                <Link to="/chat">
                  <Button size="sm" className="rounded-lg h-8 bg-navy hover:bg-navy/90 text-white px-2">
                    <MessageCircle className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" className="rounded-lg h-8 px-2 text-destructive hover:bg-destructive/5" onClick={() => handleRemove(r.id, r.name)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

export function SettingsScreen() {
  const nav = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const signOut = useMutation({
    mutationFn: async (allDevices: boolean) => {
      if (allDevices) await authApi.logoutAll();
      else { const token = tokenStorage.getRefreshToken(); if (token) await authApi.logout(token); }
    },
    onSuccess: () => { logout(); queryClient.clear(); nav("/"); },
    onError: (error) => toast.error(error.message),
  });
  const handleLogout = () => signOut.mutate(true);
  const [dark, setDark] = useState(false);
  const userId = useAuthStore(state => state.user?.id);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const profile = useQuery({ queryKey: ["profile", "me", userId], queryFn: profileApi.getMine, enabled: Boolean(userId) });
  const lifestyle = useQuery({
    queryKey: ["lifestyle", "me", userId], enabled: Boolean(userId),
    queryFn: async () => {
      try { return await lifestyleApi.getMine(); }
      catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
    },
  });
  const subscription = useQuery({ queryKey: ["subscription", "me", userId], queryFn: billingApi.subscription, enabled: Boolean(userId) });
  const openEditProfile = () => setEditProfileOpen(true);
  if (profile.isPending) return <AppShell><p role="status">Đang tải hồ sơ…</p></AppShell>;
  if (!profile.data) return <AppShell><p role="alert">{profile.error?.message ?? "Không thể tải hồ sơ."}</p><Button onClick={() => void profile.refetch()}>Thử lại</Button></AppShell>;
  const actual = profile.data;
  const missing = "Chưa cập nhật";
  const birth = actual.birthDate ? new Date(`${actual.birthDate}T00:00:00`) : null;
  const today = new Date();
  const age = birth ? today.getFullYear() - birth.getFullYear() - (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0) : null;
  const life = lifestyle.data;
  const p = {
    name: actual.displayName, age: age === null ? missing : `${age} tuổi`,
    gender: ({ male: "Nam", female: "Nữ", other: "Khác" } as Record<string, string>)[actual.gender ?? ""] ?? missing,
    occupation: actual.occupation || missing, city: actual.city || missing, district: actual.district || missing,
    bio: actual.bio || "Chưa có giới thiệu.", avatar: actual.avatarUrl ?? undefined, verified: actual.isVerified,
    sleep: life?.sleepSchedule || missing, cleanliness: life ? `${life.cleanliness}/5` : missing,
    smoke: life ? (life.smoking ? "Có" : "Không") : missing,
    pets: life ? (life.petFriendly ? "Có" : "Không") : missing,
    social: life?.socialStyle || missing,
  };
  const completion = actual.profileCompletion;

  return (
    <AppShell>
      <div className="mb-6"><SavedProfiles /></div>
      <h1 className="text-3xl font-display font-bold">Cài đặt</h1>
      <p className="text-muted-foreground mt-1">Quản lý tài khoản, bảo mật và tuỳ chỉnh.</p>

      {/* Tổng quan hồ sơ */}
      <Card className="mt-6 p-6 rounded-3xl border-0 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar className="h-20 w-20 ring-2 ring-mint shrink-0">
            <AvatarImage src={p.avatar} />
            <AvatarFallback>ME</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display font-bold text-xl">{p.name}</h2>
              <span className="text-sm text-muted-foreground">
                · {p.age} · {p.gender}
              </span>
              {p.verified && (
                <Badge className="rounded-full bg-mint/40 text-navy border-0 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Đã xác minh
                </Badge>
              )}
              {subscription.data && <Badge variant="outline" className="rounded-full">{subscription.data.isPremium ? "Premium" : "Miễn phí"}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{p.bio}</p>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Mức độ hoàn thiện hồ sơ</span>
                <span className="font-semibold text-navy">{completion}%</span>
              </div>
              <Progress value={completion} className="h-2" />
            </div>
          </div>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
            <Briefcase className="h-4 w-4 text-navy" /> {p.occupation}
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
            <MapPin className="h-4 w-4 text-navy" /> {p.district}
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
            <MapPin className="h-4 w-4 text-navy" /> {p.city}
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
            <Cake className="h-4 w-4 text-navy" /> {p.age}
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
            <Calendar className="h-4 w-4 text-navy" /> Ngủ: {p.sleep}
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
            🧹 Sạch sẽ: {p.cleanliness}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full">
            Hút thuốc: {p.smoke}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            Thú cưng: {p.pets}
          </Badge>
          <Badge variant="outline" className="rounded-full">Phong cách xã hội: {p.social}</Badge>
        </div>
        {!life && <div className="mt-4 rounded-xl bg-muted/40 p-4 text-sm">
          {lifestyle.isError ? <><p role="alert">Không thể tải thông tin lối sống.</p><Button variant="outline" onClick={() => void lifestyle.refetch()}>Thử lại</Button></> : lifestyle.isPending ? <p role="status">Đang tải thông tin lối sống…</p> : <><p>Bạn chưa cập nhật thông tin lối sống.</p><Link className="text-teal underline" to="/onboarding">Tiếp tục hoàn thiện hồ sơ</Link></>}
        </div>}

        {/* Nút chỉnh sửa hồ sơ */}
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="rounded-xl gap-2" onClick={openEditProfile}>
            <Pencil className="h-4 w-4" /> Chỉnh sửa thông tin cá nhân
          </Button>
        </div>
      </Card>

      {/* Dialog chỉnh sửa thông tin cá nhân */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Chỉnh sửa thông tin cá nhân</DialogTitle>
          </DialogHeader>
          <SettingsProfileEditor profile={actual} onSaved={() => setEditProfileOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="mt-6 grid lg:grid-cols-2 gap-5">
        <Section icon={User} title="Chỉnh sửa hồ sơ" desc="Cách bạn hiển thị với những người khác.">
          <p className="text-sm text-muted-foreground mb-4">Cập nhật tên, ngày sinh, giới tính, nơi ở và giới thiệu của bạn.</p>
          <Button variant="outline" className="rounded-xl" onClick={openEditProfile}>Chỉnh sửa hồ sơ</Button>
        </Section>

        <Section icon={Bell} title="Thông báo" desc="Chọn nội dung muốn nhận.">
          <div className="space-y-4">
            {[
              ["Ghép đôi mới", "Báo khi có người hợp với bạn"],
              ["Tin nhắn", "Tin nhắn trực tiếp và trả lời"],
              ["Lượt xem hồ sơ", "Khi có người xem hồ sơ của bạn"],
              ["Khuyến mãi", "Mẹo, tin tức và ưu đãi đặc biệt"],
            ].map(([t, d], i) => {
              const [title, desc] = [t as string, d as string];
              return (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{title}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                  <Switch defaultChecked={i < 3} />
                </div>
              );
            })}
          </div>
        </Section>

        <Section
          icon={Shield}
          title="Quyền riêng tư"
          desc="Kiểm soát ai có thể xem và liên hệ bạn."
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Hồ sơ công khai</div>
                <div className="text-xs text-muted-foreground">
                  Mọi người trên RoomieMatch có thể tìm thấy bạn
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Hiện trạng thái online</div>
                <div className="text-xs text-muted-foreground">
                  Hiển thị chấm xanh khi đang hoạt động
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Ẩn tuổi</div>
                <div className="text-xs text-muted-foreground">Giữ kín tuổi của bạn</div>
              </div>
              <Switch />
            </div>
          </div>
        </Section>

        <Section icon={Lock} title="Bảo mật tài khoản" desc="Bảo vệ tài khoản của bạn.">
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start rounded-xl">
              Đổi mật khẩu
            </Button>
            <Button variant="outline" className="w-full justify-start rounded-xl">
              Xác thực 2 lớp
            </Button>
            <Button variant="outline" className="w-full justify-start rounded-xl">
              Xác minh CCCD/CMND
            </Button>
            <Button variant="outline" disabled={signOut.isPending} onClick={() => signOut.mutate(false)}>
              Đăng xuất thiết bị này
            </Button>
            <Button
              disabled={signOut.isPending}
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-start rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4 mr-2" /> Đăng xuất khỏi mọi thiết bị
            </Button>
          </div>
        </Section>

        <Section icon={Moon} title="Giao diện" desc="Tuỳ chỉnh cách RoomieMatch hiển thị.">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Chế độ tối</div>
              <div className="text-xs text-muted-foreground">Dễ chịu cho mắt vào ban đêm</div>
            </div>
            <Switch
              checked={dark}
              onCheckedChange={(v) => {
                setDark(v);
                document.documentElement.classList.toggle("dark", v);
              }}
            />
          </div>
        </Section>

        <Section icon={Globe} title="Ngôn ngữ" desc="Chọn ngôn ngữ ưa thích.">
          <Select defaultValue="vi">
            <SelectTrigger className="rounded-xl h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vi">Tiếng Việt</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
            </SelectContent>
          </Select>
        </Section>
      </div>
    </AppShell>
  );
}
