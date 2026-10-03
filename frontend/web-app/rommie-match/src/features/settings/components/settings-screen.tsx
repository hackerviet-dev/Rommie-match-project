import { BlockedUsers } from "./blocked-users";
import { QuizHistory } from "@/features/quiz";
import { useQuery } from "@tanstack/react-query";
import { SavedProfilesList } from "@/features/profile/components/saved-profiles-list";
import { profileApi } from "@/features/profile";
import { toast } from "sonner";
import { Bookmark, MessageCircle, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { AppShell } from "@/layouts/main-layout";
import { useSignOut, useAuthStore } from "@/features/auth";
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
import {
  ACCOUNT_SECTIONS,
  type AccountSection,
} from "@/constants/account-sections";
import { AccountWorkspace } from "./account-workspace";
import { AccountPreviewPanels } from "./account-preview-panels";
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

export function SettingsScreen() {
  const [params] = useSearchParams();
  const section = (
    ACCOUNT_SECTIONS.some((item) => item.id === params.get("section"))
      ? params.get("section")
      : "profile"
  ) as AccountSection;
  const isProfile = section === "profile";
  const signOut = useSignOut();
  const handleLogout = () => signOut.mutate(true);
  const [dark, setDark] = useState(false);
  const userId = useAuthStore((state) => state.user?.id);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const profile = useQuery({
    queryKey: ["profile", "me", userId],
    queryFn: profileApi.getMine,
    enabled: Boolean(userId) && isProfile,
  });
  const lifestyle = useQuery({
    queryKey: ["lifestyle", "me", userId],
    enabled: Boolean(userId) && isProfile,
    queryFn: async () => {
      try {
        return await lifestyleApi.getMine();
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
  const subscription = useQuery({
    queryKey: ["subscription", "me", userId],
    queryFn: billingApi.subscription,
    enabled: Boolean(userId) && isProfile,
  });
  const openEditProfile = () => setEditProfileOpen(true);
  if (isProfile && profile.isPending)
    return (
      <AppShell>
        <AccountWorkspace section={section}>
          <p role="status">Đang tải hồ sơ…</p>
        </AccountWorkspace>
      </AppShell>
    );
  if (isProfile && !profile.data)
    return (
      <AppShell>
        <AccountWorkspace section={section}>
          <p role="alert">{profile.error?.message ?? "Không thể tải hồ sơ."}</p>
          <Button onClick={() => void profile.refetch()}>Thử lại</Button>
        </AccountWorkspace>
      </AppShell>
    );
  const actual = profile.data;
  const missing = "Chưa cập nhật";
  const birth = actual?.birthDate
    ? new Date(`${actual?.birthDate}T00:00:00`)
    : null;
  const today = new Date();
  const age = birth
    ? today.getFullYear() -
      birth.getFullYear() -
      (today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() &&
        today.getDate() < birth.getDate())
        ? 1
        : 0)
    : actual?.birthYear
      ? today.getFullYear() - actual.birthYear
      : null;
  const life = lifestyle.data;
  const p = {
    name: actual?.displayName,
    age: age === null ? missing : `${age} tuổi`,
    gender:
      ({ male: "Nam", female: "Nữ", other: "Khác" } as Record<string, string>)[
        actual?.gender ?? ""
      ] ?? missing,
    occupation: actual?.occupation || missing,
    city: actual?.city || missing,
    district: actual?.district || missing,
    bio: actual?.bio || "Chưa có giới thiệu.",
    avatar: actual?.avatarUrl ?? undefined,
    verified: actual?.isVerified,
    sleep: life?.sleepSchedule || missing,
    cleanliness: life ? `${life.cleanliness}/5` : missing,
    smoke: life ? (life.smoking ? "Có" : "Không") : missing,
    pets: life ? (life.petFriendly ? "Có" : "Không") : missing,
    social: life?.socialStyle || missing,
  };
  const completion = actual?.profileCompletion;

  return (
    <AppShell>
      <AccountWorkspace section={section}>
        {section === "saved" && <SavedProfilesList />}
        <AccountPreviewPanels section={section} />
        {isProfile && (
          <>
            {/* Tổng quan hồ sơ */}
            <Card className="mt-6 p-6 rounded-3xl border-0 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <Avatar className="h-20 w-20 ring-2 ring-mint shrink-0">
                  <AvatarImage src={p.avatar} />
                  <AvatarFallback>
                    {p.name?.trim().slice(0, 2).toUpperCase() || "ME"}
                  </AvatarFallback>
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
                    {subscription.data && (
                      <Badge variant="outline" className="rounded-full">
                        {subscription.data.isPremium ? "Premium" : "Miễn phí"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{p.bio}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">
                        Mức độ hoàn thiện hồ sơ
                      </span>
                      <span className="font-semibold text-navy">
                        {completion}%
                      </span>
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
                <Badge variant="outline" className="rounded-full">
                  Phong cách xã hội: {p.social}
                </Badge>
              </div>
              {!life && (
                <div className="mt-4 rounded-xl bg-muted/40 p-4 text-sm">
                  {lifestyle.isError ? (
                    <>
                      <p role="alert">Không thể tải thông tin lối sống.</p>
                      <Button
                        variant="outline"
                        onClick={() => void lifestyle.refetch()}
                      >
                        Thử lại
                      </Button>
                    </>
                  ) : lifestyle.isPending ? (
                    <p role="status">Đang tải thông tin lối sống…</p>
                  ) : (
                    <>
                      <p>Bạn chưa cập nhật thông tin lối sống.</p>
                      <Link className="text-teal underline" to="/onboarding">
                        Tiếp tục hoàn thiện hồ sơ
                      </Link>
                    </>
                  )}
                </div>
              )}

              {/* Nút chỉnh sửa hồ sơ */}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl gap-2"
                  onClick={openEditProfile}
                >
                  <Pencil className="h-4 w-4" /> Chỉnh sửa thông tin cá nhân
                </Button>
              </div>
            </Card>

            {/* Dialog chỉnh sửa thông tin cá nhân */}
            <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="font-display">
                    Chỉnh sửa thông tin cá nhân
                  </DialogTitle>
                </DialogHeader>
                {actual && (
                  <SettingsProfileEditor
                    profile={actual}
                    onSaved={() => setEditProfileOpen(false)}
                  />
                )}
              </DialogContent>
            </Dialog>

            <Card className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
              <div>
                <h2 className="font-semibold">Lối sống & khảo sát</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bổ sung thói quen và điều bạn mong đợi ở người ở ghép.
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link to="/onboarding">Hoàn thiện hồ sơ</Link>
                </Button>
                <Button asChild>
                  <Link to="/quiz">Làm khảo sát</Link>
                </Button>
              </div>
            </Card>
            <div className="mt-5">
              <QuizHistory />
            </div>
          </>
        )}
        {section === "settings" && (
          <div className="grid lg:grid-cols-2 gap-5">
            <BlockedUsers />
            <Section
              icon={Bell}
              title="Thông báo"
              desc="Tuỳ chọn thông báo · Sắp có."
            >
              <div className="space-y-4">
                {[
                  ["Ở ghép mới", "Báo khi có người hợp với bạn"],
                  ["Tin nhắn", "Tin nhắn trực tiếp và trả lời"],
                  ["Lượt xem hồ sơ", "Khi có người xem hồ sơ của bạn"],
                  ["Khuyến mãi", "Mẹo, tin tức và ưu đãi đặc biệt"],
                ].map(([t, d], i) => {
                  const [title, desc] = [t as string, d as string];
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{title}</div>
                        <div className="text-xs text-muted-foreground">
                          {desc}
                        </div>
                      </div>
                      <Switch
                        disabled
                        defaultChecked={i < 3}
                        aria-label={`${title} · Sắp có`}
                      />
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section
              icon={Shield}
              title="Quyền riêng tư"
              desc="Tuỳ chọn quyền riêng tư · Sắp có."
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Hồ sơ công khai</div>
                    <div className="text-xs text-muted-foreground">
                      Mọi người trên RoomieMatch có thể tìm thấy bạn
                    </div>
                  </div>
                  <Switch disabled defaultChecked aria-label="Sắp có" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">
                      Hiện trạng thái online
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Hiển thị chấm xanh khi đang hoạt động
                    </div>
                  </div>
                  <Switch disabled defaultChecked aria-label="Sắp có" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Ẩn tuổi</div>
                    <div className="text-xs text-muted-foreground">
                      Giữ kín tuổi của bạn
                    </div>
                  </div>
                  <Switch disabled aria-label="Sắp có" />
                </div>
              </div>
            </Section>

            <Section
              icon={Lock}
              title="Bảo mật tài khoản"
              desc="Bảo vệ tài khoản của bạn."
            >
              <div className="space-y-3">
                <Button
                  disabled
                  variant="outline"
                  className="w-full justify-start rounded-xl"
                >
                  Đổi mật khẩu · Sắp có
                </Button>
                <Button
                  disabled
                  variant="outline"
                  className="w-full justify-start rounded-xl"
                >
                  Xác thực 2 lớp · Sắp có
                </Button>
                <Button
                  disabled
                  variant="outline"
                  className="w-full justify-start rounded-xl"
                >
                  Xác minh CCCD/CMND · Sắp có
                </Button>
                <Button
                  variant="outline"
                  disabled={signOut.isPending}
                  onClick={() => signOut.mutate(false)}
                >
                  Đăng xuất thiết bị này
                </Button>
                <Button
                  disabled={signOut.isPending}
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full justify-start rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Đăng xuất khỏi mọi thiết
                  bị
                </Button>
              </div>
            </Section>

            <Section
              icon={Moon}
              title="Giao diện"
              desc="Tuỳ chỉnh cách RoomieMatch hiển thị."
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Chế độ tối</div>
                  <div className="text-xs text-muted-foreground">
                    Dễ chịu cho mắt vào ban đêm
                  </div>
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

            <Section
              icon={Globe}
              title="Ngôn ngữ"
              desc="Chọn ngôn ngữ ưa thích · Sắp có."
            >
              <Select disabled defaultValue="vi">
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
        )}
      </AccountWorkspace>
    </AppShell>
  );
}
