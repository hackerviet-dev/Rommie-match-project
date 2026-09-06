import { roommates } from "@/lib/mock-data";
import { getSaved, removeSaved } from "@/lib/saved-profiles";
import { toast } from "sonner";
import { Bookmark, MessageCircle, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { useAuthStore } from "@/stores/auth-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
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
  Wallet,
  Home,
  CheckCircle2,
  GraduationCap,
  Cake,
  Users,
  Pencil,
  X,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

// Mock dữ liệu hồ sơ đã tạo từ Onboarding
const initialProfileData = {
  name: "Nguyễn Linh",
  age: 23,
  gender: "Nữ",
  occupation: "Nhà thiết kế UX",
  school: "RMIT Việt Nam",
  city: "TP. Hồ Chí Minh",
  bio: "Nhà thiết kế UX & mê cà phê.",
  avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Me",
  sleep: "22h–0h",
  cleanliness: 4,
  smoke: "Không",
  drink: "Có",
  pets: "Không",
  social: 60,
  roomEnv: "Yên tĩnh",
  hasRoom: true,
  room: {
    address: "123 Nguyễn Huệ",
    district: "Quận 1, TP.HCM",
    bedrooms: 2,
    area: 45,
    rent: "3.500.000",
    needPeople: 1,
    moveIn: "15/01/2026",
    type: "Căn hộ",
    amenities: ["Máy lạnh", "Máy giặt", "Wi-Fi", "Bếp", "Ban công"],
  },
  verified: true,
  quizCompleted: true,
  premium: false,
};

function calcCompletion(p: typeof initialProfileData) {
  const checks = [
    p.name,
    p.age,
    p.occupation,
    p.city,
    p.bio,
    p.sleep,
    p.roomEnv,
    p.hasRoom,
    p.quizCompleted,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

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

export default function Settings() {
  const nav = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const handleLogout = () => {
    logout();
    nav("/");
  };
  const [dark, setDark] = useState(false);
  const [p, setP] = useState(initialProfileData);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [newAmenity, setNewAmenity] = useState("");

  const completion = calcCompletion(p);

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: p.name,
    age: p.age,
    gender: p.gender,
    occupation: p.occupation,
    school: p.school,
    city: p.city,
    bio: p.bio,
    sleep: p.sleep,
    cleanliness: p.cleanliness,
    smoke: p.smoke,
    drink: p.drink,
    pets: p.pets,
    social: p.social,
    roomEnv: p.roomEnv,
  });

  const [roomForm, setRoomForm] = useState({
    hasRoom: p.hasRoom,
    address: p.room.address,
    district: p.room.district,
    bedrooms: p.room.bedrooms,
    area: p.room.area,
    rent: p.room.rent,
    needPeople: p.room.needPeople,
    moveIn: p.room.moveIn,
    type: p.room.type,
    amenities: [...p.room.amenities],
  });

  const openEditProfile = () => {
    setProfileForm({
      name: p.name,
      age: p.age,
      gender: p.gender,
      occupation: p.occupation,
      school: p.school,
      city: p.city,
      bio: p.bio,
      sleep: p.sleep,
      cleanliness: p.cleanliness,
      smoke: p.smoke,
      drink: p.drink,
      pets: p.pets,
      social: p.social,
      roomEnv: p.roomEnv,
    });
    setEditProfileOpen(true);
  };

  const openEditRoom = () => {
    setRoomForm({
      hasRoom: p.hasRoom,
      address: p.room.address,
      district: p.room.district,
      bedrooms: p.room.bedrooms,
      area: p.room.area,
      rent: p.room.rent,
      needPeople: p.room.needPeople,
      moveIn: p.room.moveIn,
      type: p.room.type,
      amenities: [...p.room.amenities],
    });
    setEditRoomOpen(true);
  };

  const saveProfile = () => {
    setP((prev) => ({ ...prev, ...profileForm }));
    setEditProfileOpen(false);
  };

  const saveRoom = () => {
    setP((prev) => ({
      ...prev,
      hasRoom: roomForm.hasRoom,
      room: {
        address: roomForm.address,
        district: roomForm.district,
        bedrooms: roomForm.bedrooms,
        area: roomForm.area,
        rent: roomForm.rent,
        needPeople: roomForm.needPeople,
        moveIn: roomForm.moveIn,
        type: roomForm.type,
        amenities: roomForm.amenities,
      },
    }));
    setEditRoomOpen(false);
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !roomForm.amenities.includes(newAmenity.trim())) {
      setRoomForm((prev) => ({ ...prev, amenities: [...prev.amenities, newAmenity.trim()] }));
      setNewAmenity("");
    }
  };

  const removeAmenity = (item: string) => {
    setRoomForm((prev) => ({ ...prev, amenities: prev.amenities.filter((a) => a !== item) }));
  };

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
                · {p.age} tuổi · {p.gender}
              </span>
              {p.verified && (
                <Badge className="rounded-full bg-mint/40 text-navy border-0 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Đã xác minh
                </Badge>
              )}
              {p.quizCompleted && (
                <Badge className="rounded-full bg-teal/20 text-navy border-0">
                  Đã làm trắc nghiệm
                </Badge>
              )}
              {p.premium ? (
                <Badge className="rounded-full bg-amber-100 text-amber-800 border-0">Premium</Badge>
              ) : (
                <Badge variant="outline" className="rounded-full">
                  Miễn phí
                </Badge>
              )}
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
            <GraduationCap className="h-4 w-4 text-navy" /> {p.school}
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
            <MapPin className="h-4 w-4 text-navy" /> {p.city}
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
            <Cake className="h-4 w-4 text-navy" /> {p.age} tuổi
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
            <Calendar className="h-4 w-4 text-navy" /> Ngủ: {p.sleep}
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
            🧹 Sạch sẽ: {p.cleanliness}/5
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full">
            Hút thuốc: {p.smoke}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            Uống bia rượu: {p.drink}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            Thú cưng: {p.pets}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            Không gian: {p.roomEnv}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            Hướng ngoại: {p.social}%
          </Badge>
        </div>

        {/* Tình trạng chỗ ở */}
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-mint/20 to-teal/10 border border-mint/30">
          <div className="flex items-center gap-2 mb-3">
            <Home className="h-5 w-5 text-navy" />
            <span className="font-display font-bold">
              {p.hasRoom ? "Bạn đang có phòng" : "Bạn đang tìm phòng"}
            </span>
            <Badge className="rounded-full bg-navy text-white border-0 ml-auto">
              {p.hasRoom ? "Tìm bạn cùng phòng" : "Tìm phòng & bạn cùng phòng"}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg h-8 px-2"
              onClick={openEditRoom}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          {p.hasRoom && (
            <>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> {p.room.address},{" "}
                  {p.room.district}
                </div>
                <div className="flex items-center gap-2">
                  🏷️ {p.room.type} · {p.room.bedrooms} PN · {p.room.area} m²
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" /> {p.room.rent} đ/người
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" /> Cần thêm {p.room.needPeople}{" "}
                  người
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" /> Dọn vào {p.room.moveIn}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.room.amenities.map((a: string) => (
                  <Badge key={a} variant="secondary" className="rounded-full text-xs">
                    {a}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div>

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
          <div className="space-y-4 mt-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Tên hiển thị</Label>
                <Input
                  className="mt-1.5 h-10 rounded-xl"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tuổi</Label>
                <Input
                  type="number"
                  className="mt-1.5 h-10 rounded-xl"
                  value={profileForm.age}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, age: Number(e.target.value) }))
                  }
                />
              </div>
              <div>
                <Label>Giới tính</Label>
                <Select
                  value={profileForm.gender}
                  onValueChange={(v) => setProfileForm((prev) => ({ ...prev, gender: v }))}
                >
                  <SelectTrigger className="mt-1.5 h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nam">Nam</SelectItem>
                    <SelectItem value="Nữ">Nữ</SelectItem>
                    <SelectItem value="Khác">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Thành phố</Label>
                <Input
                  className="mt-1.5 h-10 rounded-xl"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <Label>Nghề nghiệp</Label>
                <Input
                  className="mt-1.5 h-10 rounded-xl"
                  value={profileForm.occupation}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, occupation: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Trường học</Label>
                <Input
                  className="mt-1.5 h-10 rounded-xl"
                  value={profileForm.school}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, school: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Giới thiệu</Label>
              <Input
                className="mt-1.5 h-10 rounded-xl"
                value={profileForm.bio}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
              />
            </div>

            <div className="border-t pt-4 mt-2">
              <div className="font-display font-bold text-sm mb-3">Lối sống</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Giờ ngủ</Label>
                  <Input
                    className="mt-1.5 h-10 rounded-xl"
                    value={profileForm.sleep}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, sleep: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Sạch sẽ (1-5)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    className="mt-1.5 h-10 rounded-xl"
                    value={profileForm.cleanliness}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, cleanliness: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <Label>Hút thuốc</Label>
                  <Select
                    value={profileForm.smoke}
                    onValueChange={(v) => setProfileForm((prev) => ({ ...prev, smoke: v }))}
                  >
                    <SelectTrigger className="mt-1.5 h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Có">Có</SelectItem>
                      <SelectItem value="Không">Không</SelectItem>
                      <SelectItem value="Thỉnh thoảng">Thỉnh thoảng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Uống bia/rượu</Label>
                  <Select
                    value={profileForm.drink}
                    onValueChange={(v) => setProfileForm((prev) => ({ ...prev, drink: v }))}
                  >
                    <SelectTrigger className="mt-1.5 h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Có">Có</SelectItem>
                      <SelectItem value="Không">Không</SelectItem>
                      <SelectItem value="Thỉnh thoảng">Thỉnh thoảng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Thú cưng</Label>
                  <Select
                    value={profileForm.pets}
                    onValueChange={(v) => setProfileForm((prev) => ({ ...prev, pets: v }))}
                  >
                    <SelectTrigger className="mt-1.5 h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Có">Có</SelectItem>
                      <SelectItem value="Không">Không</SelectItem>
                      <SelectItem value="Thích nhưng không nuôi">Thích nhưng không nuôi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Không gian sống</Label>
                  <Select
                    value={profileForm.roomEnv}
                    onValueChange={(v) => setProfileForm((prev) => ({ ...prev, roomEnv: v }))}
                  >
                    <SelectTrigger className="mt-1.5 h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yên tĩnh">Yên tĩnh</SelectItem>
                      <SelectItem value="Sôi động">Sôi động</SelectItem>
                      <SelectItem value="Cân bằng">Cân bằng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Hướng ngoại (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="mt-1.5 h-10 rounded-xl"
                    value={profileForm.social}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, social: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                className="rounded-xl gap-1"
                onClick={() => setEditProfileOpen(false)}
              >
                <X className="h-4 w-4" /> Huỷ
              </Button>
              <Button
                className="rounded-xl bg-navy hover:bg-navy/90 text-white gap-1"
                onClick={saveProfile}
              >
                <Save className="h-4 w-4" /> Lưu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog chỉnh sửa thông tin phòng */}
      <Dialog open={editRoomOpen} onOpenChange={setEditRoomOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Chỉnh sửa thông tin phòng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <div>
                <div className="text-sm font-medium">Bạn đang có phòng?</div>
                <div className="text-xs text-muted-foreground">
                  Bật nếu bạn đã có phòng và cần tìm bạn cùng phòng
                </div>
              </div>
              <Switch
                checked={roomForm.hasRoom}
                onCheckedChange={(v) => setRoomForm((prev) => ({ ...prev, hasRoom: v }))}
              />
            </div>

            {roomForm.hasRoom && (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Địa chỉ</Label>
                    <Input
                      className="mt-1.5 h-10 rounded-xl"
                      value={roomForm.address}
                      onChange={(e) =>
                        setRoomForm((prev) => ({ ...prev, address: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Quận/Huyện</Label>
                    <Input
                      className="mt-1.5 h-10 rounded-xl"
                      value={roomForm.district}
                      onChange={(e) =>
                        setRoomForm((prev) => ({ ...prev, district: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Loại phòng</Label>
                    <Select
                      value={roomForm.type}
                      onValueChange={(v) => setRoomForm((prev) => ({ ...prev, type: v }))}
                    >
                      <SelectTrigger className="mt-1.5 h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Căn hộ">Căn hộ</SelectItem>
                        <SelectItem value="Phòng trọ">Phòng trọ</SelectItem>
                        <SelectItem value="Nhà nguyên căn">Nhà nguyên căn</SelectItem>
                        <SelectItem value="Chung cư mini">Chung cư mini</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Số phòng ngủ</Label>
                    <Input
                      type="number"
                      className="mt-1.5 h-10 rounded-xl"
                      value={roomForm.bedrooms}
                      onChange={(e) =>
                        setRoomForm((prev) => ({ ...prev, bedrooms: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Diện tích (m²)</Label>
                    <Input
                      type="number"
                      className="mt-1.5 h-10 rounded-xl"
                      value={roomForm.area}
                      onChange={(e) =>
                        setRoomForm((prev) => ({ ...prev, area: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Giá thuê/người (đ)</Label>
                    <Input
                      className="mt-1.5 h-10 rounded-xl"
                      value={roomForm.rent}
                      onChange={(e) => setRoomForm((prev) => ({ ...prev, rent: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Cần thêm (người)</Label>
                    <Input
                      type="number"
                      className="mt-1.5 h-10 rounded-xl"
                      value={roomForm.needPeople}
                      onChange={(e) =>
                        setRoomForm((prev) => ({ ...prev, needPeople: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Ngày dọn vào</Label>
                    <Input
                      className="mt-1.5 h-10 rounded-xl"
                      value={roomForm.moveIn}
                      onChange={(e) => setRoomForm((prev) => ({ ...prev, moveIn: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Tiện ích</Label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {roomForm.amenities.map((a: string) => (
                      <Badge
                        key={a}
                        variant="secondary"
                        className="rounded-full text-xs gap-1 pr-1"
                      >
                        {a}
                        <button onClick={() => removeAmenity(a)} className="hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input
                      className="h-9 rounded-xl text-sm"
                      placeholder="Thêm tiện ích..."
                      value={newAmenity}
                      onChange={(e) => setNewAmenity(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addAmenity()}
                    />
                    <Button
                      size="sm"
                      className="rounded-xl h-9 px-3 bg-navy hover:bg-navy/90 text-white"
                      onClick={addAmenity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                className="rounded-xl gap-1"
                onClick={() => setEditRoomOpen(false)}
              >
                <X className="h-4 w-4" /> Huỷ
              </Button>
              <Button
                className="rounded-xl bg-navy hover:bg-navy/90 text-white gap-1"
                onClick={saveRoom}
              >
                <Save className="h-4 w-4" /> Lưu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-6 grid lg:grid-cols-2 gap-5">
        <Section icon={User} title="Chỉnh sửa hồ sơ" desc="Cách bạn hiển thị với những người khác.">
          <div className="flex items-center gap-4 mb-5">
            <Avatar className="h-16 w-16 ring-2 ring-mint">
              <AvatarImage src={p.avatar} />
              <AvatarFallback>ME</AvatarFallback>
            </Avatar>
            <Button variant="outline" className="rounded-xl">
              Đổi ảnh
            </Button>
          </div>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Tên hiển thị</Label>
                <Input className="mt-1.5 h-10 rounded-xl" defaultValue={p.name} />
              </div>
              <div>
                <Label>Tuổi</Label>
                <Input type="number" className="mt-1.5 h-10 rounded-xl" defaultValue={p.age} />
              </div>
              <div>
                <Label>Nghề nghiệp</Label>
                <Input className="mt-1.5 h-10 rounded-xl" defaultValue={p.occupation} />
              </div>
              <div>
                <Label>Thành phố</Label>
                <Input className="mt-1.5 h-10 rounded-xl" defaultValue={p.city} />
              </div>
            </div>
            <div>
              <Label>Giới thiệu</Label>
              <Input className="mt-1.5 h-10 rounded-xl" defaultValue={p.bio} />
            </div>
            <Button className="rounded-xl bg-navy hover:bg-navy/90 text-white">Lưu thay đổi</Button>
          </div>
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
            <Button
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
