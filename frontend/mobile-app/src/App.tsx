import "./global.css";

import {
  Bell,
  Check,
  ChevronRight,
  Droplets,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  Store,
  Wifi,
  Wrench,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import { Badge, BadgeText } from "./components/ui/badge";
import {
  Button,
  ButtonGroup,
  ButtonIcon,
  ButtonText,
} from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { GluestackUIProvider } from "./components/ui/gluestack-ui-provider";
import { cn } from "./lib/cn";

type TabKey = "home" | "match" | "chat" | "services" | "premium";

type Roommate = {
  age: number;
  budget: string;
  initials: string;
  match: number;
  name: string;
  neighborhood: string;
  occupation: string;
  tags: string[];
  vibe: string;
};

const roommates: Roommate[] = [
  {
    age: 23,
    budget: "4–6 triệu/tháng",
    initials: "NL",
    match: 96,
    name: "Nguyễn Linh",
    neighborhood: "Quận 1, TP.HCM",
    occupation: "Nhà thiết kế UX",
    tags: ["Ngủ sớm", "Gọn gàng", "Gần trung tâm"],
    vibe: "Thích không gian yên tĩnh, sạch sẽ và tôn trọng thời gian riêng của nhau.",
  },
  {
    age: 25,
    budget: "3–5 triệu/tháng",
    initials: "TM",
    match: 92,
    name: "Trần Minh",
    neighborhood: "Bình Thạnh, TP.HCM",
    occupation: "Kỹ sư phần mềm",
    tags: ["Cú đêm", "Yêu thú cưng", "Không hút thuốc"],
    vibe: "Làm việc linh hoạt, nấu ăn cuối tuần và luôn giữ khu vực chung ngăn nắp.",
  },
  {
    age: 22,
    budget: "3–4 triệu/tháng",
    initials: "HM",
    match: 89,
    name: "Hà My",
    neighborhood: "Thủ Đức, TP.HCM",
    occupation: "Sinh viên năm cuối",
    tags: ["Học khuya", "Thân thiện", "Đi metro"],
    vibe: "Cởi mở, ưu tiên giao tiếp rõ ràng và cần một góc học tập yên tĩnh.",
  },
];

const chats = [
  {
    initials: "NL",
    last: "Mai mình ghé xem phòng sau giờ làm nhé?",
    name: "Nguyễn Linh",
    time: "12 phút",
    unread: true,
  },
  {
    initials: "TM",
    last: "Mình vừa gửi lịch sinh hoạt và ngân sách.",
    name: "Trần Minh",
    time: "1 giờ",
    unread: false,
  },
  {
    initials: "HM",
    last: "Bạn có muốn đặt giờ yên tĩnh sau 22h không?",
    name: "Hà My",
    time: "3 giờ",
    unread: false,
  },
];

const nearbyServices = [
  {
    color: "bg-sky-50",
    distance: "0,4 km",
    icon: Droplets,
    name: "Giao nước",
    price: "Từ 25.000₫",
  },
  {
    color: "bg-teal/10",
    distance: "0,7 km",
    icon: Shirt,
    name: "Giặt ủi",
    price: "Từ 20.000₫",
  },
  {
    color: "bg-amber-50",
    distance: "1,1 km",
    icon: Wrench,
    name: "Sửa chữa",
    price: "Từ 80.000₫",
  },
  {
    color: "bg-mint/20",
    distance: "1,6 km",
    icon: Wifi,
    name: "Internet",
    price: "Từ 165.000₫",
  },
];

function LogoMark() {
  return (
    <View className="h-10 w-10 items-center justify-center rounded-2xl bg-mint/40">
      <Home color="#0B3B6E" fill="#8FD3C1" size={22} strokeWidth={2.4} />
      <Heart
        color="#15A9B8"
        fill="#15A9B8"
        size={9}
        style={{ position: "absolute" }}
      />
    </View>
  );
}

function MatchScore({
  value,
  compact = false,
}: {
  value: number;
  compact?: boolean;
}) {
  return (
    <View
      className={cn(
        "items-center justify-center rounded-full border-4 border-teal bg-white",
        compact ? "h-14 w-14" : "h-16 w-16",
      )}
    >
      <Text
        className={cn("font-bold text-navy", compact ? "text-base" : "text-lg")}
      >
        {value}%
      </Text>
    </View>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [roommateIndex, setRoommateIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const activeRoommate = roommates[roommateIndex];

  const headerTitle = useMemo(() => {
    const titles: Record<TabKey, string> = {
      home: "Trang chính",
      match: "Ghép đôi",
      chat: "Tin nhắn",
      services: "Dịch vụ",
      premium: "RoomieMatch Premium",
    };
    return titles[activeTab];
  }, [activeTab]);

  function nextRoommate() {
    setRoommateIndex((current) => (current + 1) % roommates.length);
  }

  function likeRoommate() {
    setLiked((current) =>
      current.includes(activeRoommate.name)
        ? current
        : [...current, activeRoommate.name],
    );
    nextRoommate();
  }

  return (
    <View className="flex-1 bg-paper">
      <StatusBar barStyle="dark-content" backgroundColor="#F7FBFC" />
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 px-4 pb-2 pt-2">
          <View className="mb-5 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <LogoMark />
              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-teal">
                  RoomieMatch
                </Text>
                <Text className="mt-0.5 text-2xl font-bold text-ink">
                  {headerTitle}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white">
                <Bell color="#0B3B6E" size={19} />
              </Pressable>
              <Avatar size="sm" className="border-2 border-mint bg-mint/30">
                <AvatarFallback className="text-sm text-navy">
                  ME
                </AvatarFallback>
              </Avatar>
            </View>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 22 }}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "home" ? (
              <HomeScreen onOpenMatches={() => setActiveTab("match")} />
            ) : null}
            {activeTab === "match" ? (
              <MatchScreen
                likedCount={liked.length}
                onLike={likeRoommate}
                onSkip={nextRoommate}
                roommate={activeRoommate}
              />
            ) : null}
            {activeTab === "chat" ? <ChatScreen /> : null}
            {activeTab === "services" ? <ServicesScreen /> : null}
            {activeTab === "premium" ? <PremiumScreen /> : null}
          </ScrollView>

          <BottomTabs activeTab={activeTab} onChange={setActiveTab} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function HomeScreen({ onOpenMatches }: { onOpenMatches: () => void }) {
  return (
    <View className="gap-4">
      <Card className="border-0 bg-navy p-5">
        <View className="flex-row items-start justify-between">
          <View className="max-w-[72%]">
            <Badge action="success">
              <BadgeText action="success">✨ Ghép đôi bằng AI</BadgeText>
            </Badge>
            <Text className="mt-4 text-3xl font-bold leading-9 text-white">
              Chào mừng trở lại, Linh 👋
            </Text>
            <Text className="mt-2 text-sm leading-5 text-slate-200">
              Hồ sơ của bạn đang được 24 người phù hợp quan tâm.
            </Text>
          </View>
          <MatchScore value={92} compact />
        </View>
        <Button
          action="secondary"
          className="mt-5 rounded-2xl"
          onPress={onOpenMatches}
        >
          <ButtonText>Xem kết quả ghép đôi</ButtonText>
          <ButtonIcon as={ChevronRight} />
        </Button>
      </Card>

      <View className="flex-row gap-3">
        {[
          ["24", "Kết quả"],
          ["8", "Tin nhắn"],
          ["85%", "Hồ sơ"],
        ].map(([value, label]) => (
          <Card className="flex-1 items-center p-3" key={label}>
            <Text className="text-2xl font-bold text-navy">{value}</Text>
            <Text className="mt-1 text-center text-xs font-semibold text-slate-500">
              {label}
            </Text>
          </Card>
        ))}
      </View>

      <Card>
        <View className="flex-row items-center justify-between">
          <View>
            <CardTitle className="text-lg">Hoàn thiện hồ sơ</CardTitle>
            <CardDescription>Thêm ảnh để tăng cơ hội ghép đôi.</CardDescription>
          </View>
          <Text className="font-bold text-teal">85%</Text>
        </View>
        <View className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <View className="h-full w-[85%] rounded-full bg-teal" />
        </View>
      </Card>

      <View className="flex-row items-center justify-between px-1">
        <Text className="text-lg font-bold text-ink">Gợi ý cho bạn</Text>
        <Pressable onPress={onOpenMatches}>
          <Text className="font-semibold text-teal">Xem tất cả</Text>
        </Pressable>
      </View>
      {roommates.slice(0, 2).map((roommate) => (
        <Card className="flex-row items-center gap-3" key={roommate.name}>
          <Avatar className="bg-mint/30">
            <AvatarFallback className="text-navy">
              {roommate.initials}
            </AvatarFallback>
          </Avatar>
          <View className="min-w-0 flex-1">
            <Text className="text-base font-bold text-ink">
              {roommate.name}, {roommate.age}
            </Text>
            <Text className="text-sm text-slate-500">
              {roommate.occupation} · {roommate.neighborhood.split(",")[0]}
            </Text>
          </View>
          <MatchScore value={roommate.match} compact />
        </Card>
      ))}
    </View>
  );
}

function MatchScreen({
  likedCount,
  onLike,
  onSkip,
  roommate,
}: {
  likedCount: number;
  onLike: () => void;
  onSkip: () => void;
  roommate: Roommate;
}) {
  return (
    <View className="gap-4">
      <View className="flex-row items-end justify-between px-1">
        <View>
          <Text className="text-2xl font-bold text-ink">
            Kết quả phù hợp nhất
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            Xếp hạng theo điểm tương thích AI.
          </Text>
        </View>
        <Badge action="info">
          <BadgeText action="info">{likedCount} đã lưu</BadgeText>
        </Badge>
      </View>
      <Card className="overflow-hidden border-0 p-0">
        <View className="min-h-[300px] justify-between bg-navy p-5">
          <View className="flex-row items-center justify-between">
            <Badge action="success">
              <BadgeText action="success">Phù hợp cao</BadgeText>
            </Badge>
            <MatchScore value={roommate.match} compact />
          </View>
          <View>
            <Avatar size="lg" className="mb-4 border-2 border-white bg-mint">
              <AvatarFallback className="text-xl text-navy">
                {roommate.initials}
              </AvatarFallback>
            </Avatar>
            <Text className="text-3xl font-bold text-white">
              {roommate.name}, {roommate.age}
            </Text>
            <Text className="mt-1 font-semibold text-mint">
              {roommate.occupation}
            </Text>
            <View className="mt-3 flex-row items-center gap-2">
              <MapPin color="#8FD3C1" size={17} />
              <Text className="text-sm text-white">
                {roommate.neighborhood}
              </Text>
            </View>
            <Text className="mt-4 text-sm leading-5 text-slate-200">
              {roommate.vibe}
            </Text>
          </View>
        </View>
        <View className="gap-4 p-4">
          <View className="flex-row flex-wrap gap-2">
            {roommate.tags.map((tag) => (
              <Badge action="success" key={tag}>
                <BadgeText action="success">{tag}</BadgeText>
              </Badge>
            ))}
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-slate-500">Ngân sách mong muốn</Text>
            <Text className="font-bold text-navy">{roommate.budget}</Text>
          </View>
          <ButtonGroup className="w-full">
            <Button
              action="muted"
              className="h-14 flex-1 rounded-2xl"
              onPress={onSkip}
              variant="outline"
            >
              <ButtonIcon as={X} />
              <ButtonText>Bỏ qua</ButtonText>
            </Button>
            <Button
              action="secondary"
              className="h-14 flex-1 rounded-2xl"
              onPress={onLike}
            >
              <ButtonIcon as={Heart} />
              <ButtonText>Quan tâm</ButtonText>
            </Button>
          </ButtonGroup>
        </View>
      </Card>
      <View className="flex-row gap-3">
        <Card className="flex-1">
          <ShieldCheck color="#15A9B8" size={20} />
          <CardTitle className="mt-2 text-base">Đã xác minh</CardTitle>
          <CardDescription>Danh tính và trường học</CardDescription>
        </Card>
        <Card className="flex-1">
          <Sparkles color="#0B3B6E" size={20} />
          <CardTitle className="mt-2 text-base">AI phân tích</CardTitle>
          <CardDescription>12 tiêu chí lối sống</CardDescription>
        </Card>
      </View>
    </View>
  );
}

function ChatScreen() {
  return (
    <View className="gap-3">
      <Text className="mb-1 text-sm text-slate-500">
        3 cuộc trò chuyện gần đây
      </Text>
      {chats.map((chat) => (
        <Card className="p-3" key={chat.name}>
          <View className="flex-row items-center gap-3">
            <Avatar className="bg-mint/30">
              <AvatarFallback className="text-navy">
                {chat.initials}
              </AvatarFallback>
            </Avatar>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-ink">
                  {chat.name}
                </Text>
                <Text className="text-xs text-slate-400">{chat.time}</Text>
              </View>
              <Text
                className="mt-1 text-sm leading-5 text-slate-500"
                numberOfLines={2}
              >
                {chat.last}
              </Text>
            </View>
            {chat.unread ? (
              <View className="h-2.5 w-2.5 rounded-full bg-teal" />
            ) : null}
          </View>
        </Card>
      ))}
      <Card className="mt-1 bg-mint/20">
        <CardHeader>
          <CardTitle className="text-lg">Gợi ý mở lời</CardTitle>
          <CardDescription>
            Hỏi về giờ giấc và quy tắc ở chung để hiểu nhau hơn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button action="secondary" className="rounded-2xl">
            <ButtonIcon as={Send} />
            <ButtonText>Soạn tin nhắn</ButtonText>
          </Button>
        </CardContent>
      </Card>
    </View>
  );
}

function ServicesScreen() {
  return (
    <View className="gap-3">
      <Text className="text-sm leading-5 text-slate-500">
        Các dịch vụ uy tín quanh khu vực của bạn.
      </Text>
      {nearbyServices.map((service) => {
        const Icon = service.icon;
        return (
          <Card className="flex-row items-center gap-4" key={service.name}>
            <View
              className={cn(
                "h-12 w-12 items-center justify-center rounded-2xl",
                service.color,
              )}
            >
              <Icon color="#0B3B6E" size={22} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-ink">
                {service.name}
              </Text>
              <Text className="mt-0.5 text-sm text-slate-500">
                {service.distance} · {service.price}
              </Text>
            </View>
            <ChevronRight color="#15A9B8" size={20} />
          </Card>
        );
      })}
      <Card className="mt-1 border-0 bg-navy">
        <Store color="#8FD3C1" size={24} />
        <Text className="mt-3 text-xl font-bold text-white">
          Ổn định cuộc sống nhanh hơn
        </Text>
        <Text className="mt-2 text-sm leading-5 text-slate-200">
          Đặt dịch vụ địa phương đáng tin cậy ngay khi vừa dọn vào.
        </Text>
      </Card>
    </View>
  );
}

function PremiumScreen() {
  const benefits = [
    "Phân tích tương thích nâng cao",
    "Quét ghép đôi không giới hạn",
    "Bộ lọc ngân sách và khu vực",
    "Boost hồ sơ — xem nhiều hơn 5 lần",
  ];
  return (
    <View className="gap-4">
      <Card className="items-center border-0 bg-navy px-5 py-7">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-mint/20">
          <Sparkles color="#8FD3C1" size={28} />
        </View>
        <Text className="mt-4 text-center text-3xl font-bold text-white">
          Ghép thông minh hơn
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-slate-200">
          Tìm đúng người và dọn vào nhanh hơn với các công cụ nâng cao.
        </Text>
        <View className="mt-5 flex-row items-end">
          <Text className="text-4xl font-bold text-white">20.000₫</Text>
          <Text className="mb-1 text-mint"> / tháng</Text>
        </View>
        <Button action="secondary" className="mt-5 w-full rounded-2xl">
          <ButtonIcon as={Star} />
          <ButtonText>Nâng cấp Premium</ButtonText>
        </Button>
      </Card>
      <Card>
        <CardTitle className="text-lg">Quyền lợi Premium</CardTitle>
        <View className="mt-4 gap-4">
          {benefits.map((benefit) => (
            <View className="flex-row items-center gap-3" key={benefit}>
              <View className="h-7 w-7 items-center justify-center rounded-full bg-mint/30">
                <Check color="#0B3B6E" size={16} />
              </View>
              <Text className="flex-1 text-sm font-medium text-ink">
                {benefit}
              </Text>
            </View>
          ))}
        </View>
      </Card>
      <View className="flex-row items-center justify-center gap-2">
        <ShieldCheck color="#15A9B8" size={16} />
        <Text className="text-xs text-slate-500">
          Thanh toán an toàn · Huỷ bất cứ lúc nào
        </Text>
      </View>
    </View>
  );
}

function BottomTabs({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  const tabs = [
    { icon: Home, key: "home" as const, label: "Trang chính" },
    { icon: Heart, key: "match" as const, label: "Ghép đôi" },
    { icon: MessageCircle, key: "chat" as const, label: "Tin nhắn" },
    { icon: Store, key: "services" as const, label: "Dịch vụ" },
    { icon: Sparkles, key: "premium" as const, label: "Premium" },
  ];
  return (
    <View className="mt-2 flex-row rounded-3xl border border-slate-100 bg-white p-1.5">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.key;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={cn(
              "h-14 flex-1 items-center justify-center gap-1 rounded-2xl",
              active && "bg-mint/30",
            )}
            key={tab.key}
            onPress={() => onChange(tab.key)}
          >
            <Icon
              color={active ? "#15A9B8" : "#64748b"}
              fill={active && tab.key === "match" ? "#8FD3C1" : "transparent"}
              size={19}
              strokeWidth={2.3}
            />
            <Text
              className={cn(
                "text-[10px] font-semibold",
                active ? "text-teal" : "text-slate-500",
              )}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GluestackUIProvider>
        <AppContent />
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
