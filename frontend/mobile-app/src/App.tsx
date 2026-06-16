import "./global.css";

import {
  CheckCircle2,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  User,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import { Badge, BadgeText } from "./components/ui/badge";
import { Button, ButtonGroup, ButtonIcon, ButtonText } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { GluestackUIProvider } from "./components/ui/gluestack-ui-provider";
import { cn } from "./lib/cn";

type TabKey = "match" | "chat" | "profile";

type Student = {
  budget: string;
  initials: string;
  match: number;
  name: string;
  neighborhood: string;
  tags: string[];
  vibe: string;
};

const students: Student[] = [
  {
    budget: "$280-340/mo",
    initials: "HL",
    match: 94,
    name: "Hana Le",
    neighborhood: "District 7",
    tags: ["Quiet nights", "Clean kitchen", "Near campus"],
    vibe: "Computer science student looking for a calm room and a study-first routine.",
  },
  {
    budget: "$220-300/mo",
    initials: "MT",
    match: 89,
    name: "Minh Tran",
    neighborhood: "Thu Duc",
    tags: ["Early riser", "Gym", "Pet friendly"],
    vibe: "Keeps shared spaces tidy, cooks on weekends, and prefers direct communication.",
  },
  {
    budget: "$300-380/mo",
    initials: "AN",
    match: 86,
    name: "An Nguyen",
    neighborhood: "Binh Thanh",
    tags: ["Night study", "No smoking", "Bus access"],
    vibe: "Design major with a packed schedule, searching for a respectful house rhythm.",
  },
];

const chats = [
  {
    initials: "HL",
    last: "I can visit the room after class tomorrow.",
    name: "Hana Le",
    time: "12m",
    unread: true,
  },
  {
    initials: "MT",
    last: "Shared my schedule and budget details.",
    name: "Minh Tran",
    time: "1h",
    unread: false,
  },
  {
    initials: "AN",
    last: "Do you prefer quiet hours after 10pm?",
    name: "An Nguyen",
    time: "3h",
    unread: false,
  },
];

const profileStats = [
  ["12", "New likes"],
  ["7", "Chats"],
  ["92%", "Profile"],
];

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabKey>("match");
  const [studentIndex, setStudentIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);

  const activeStudent = students[studentIndex];
  const headerTitle = useMemo(() => {
    if (activeTab === "match") return "Find a roomie";
    if (activeTab === "chat") return "Messages";
    return "Student profile";
  }, [activeTab]);

  function nextStudent() {
    setStudentIndex((current) => (current + 1) % students.length);
  }

  function likeStudent() {
    setLiked((current) =>
      current.includes(activeStudent.name) ? current : [...current, activeStudent.name],
    );
    nextStudent();
  }

  return (
    <View className="flex-1 bg-paper">
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 px-5 pb-3 pt-2">
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-semibold uppercase text-coral">RoomieMatch</Text>
              <Text className="mt-1 text-3xl font-bold text-ink">{headerTitle}</Text>
            </View>
            <Button variant="outline" action="muted" size="md" className="h-11 w-11 px-0">
              <ButtonIcon as={SlidersHorizontal} />
            </Button>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "match" ? (
              <MatchScreen
                likedCount={liked.length}
                onLike={likeStudent}
                onSkip={nextStudent}
                student={activeStudent}
              />
            ) : null}
            {activeTab === "chat" ? <ChatScreen /> : null}
            {activeTab === "profile" ? <ProfileScreen liked={liked} /> : null}
          </ScrollView>

          <BottomTabs activeTab={activeTab} onChange={setActiveTab} />
        </View>
      </SafeAreaView>
    </View>
  );
}

type MatchScreenProps = {
  likedCount: number;
  onLike: () => void;
  onSkip: () => void;
  student: Student;
};

function MatchScreen({ likedCount, onLike, onSkip, student }: MatchScreenProps) {
  return (
    <View className="gap-4">
      <Card className="overflow-hidden p-0">
        <View className="min-h-[340px] justify-between bg-ink p-5">
          <View className="flex-row items-center justify-between">
            <Badge action="info">
              <BadgeText action="info">{student.match}% match</BadgeText>
            </Badge>
            <Text className="text-sm font-semibold text-white">{student.budget}</Text>
          </View>

          <View>
            <Avatar size="lg" className="mb-4 bg-white">
              <AvatarFallback className="text-2xl text-coral">{student.initials}</AvatarFallback>
            </Avatar>
            <Text className="text-4xl font-bold text-white">{student.name}</Text>
            <View className="mt-3 flex-row items-center gap-2">
              <MapPin color="#f9735b" size={18} />
              <Text className="text-base font-semibold text-white">{student.neighborhood}</Text>
            </View>
            <Text className="mt-4 text-base leading-6 text-slate-200">{student.vibe}</Text>
          </View>
        </View>

        <View className="gap-4 p-4">
          <View className="flex-row flex-wrap gap-2">
            {student.tags.map((tag) => (
              <Badge action="muted" key={tag}>
                <BadgeText action="muted">{tag}</BadgeText>
              </Badge>
            ))}
          </View>
          <ButtonGroup className="w-full">
            <Button
              action="muted"
              className="h-14 flex-1 rounded-2xl"
              onPress={onSkip}
              variant="outline"
            >
              <ButtonIcon as={X} />
              <ButtonText>Skip</ButtonText>
            </Button>
            <Button action="negative" className="h-14 flex-1 rounded-2xl" onPress={onLike}>
              <ButtonIcon as={Heart} />
              <ButtonText>Like</ButtonText>
            </Button>
          </ButtonGroup>
        </View>
      </Card>

      <View className="flex-row gap-3">
        <Card className="flex-1">
          <CardHeader>
            <Sparkles color="#7c3aed" size={20} />
            <CardTitle className="text-lg">Smart queue</CardTitle>
            <CardDescription>{likedCount} saved students this week</CardDescription>
          </CardHeader>
        </Card>
        <Card className="flex-1">
          <CardHeader>
            <ShieldCheck color="#14b8a6" size={20} />
            <CardTitle className="text-lg">Verified</CardTitle>
            <CardDescription>School email and budget checked</CardDescription>
          </CardHeader>
        </Card>
      </View>
    </View>
  );
}

function ChatScreen() {
  return (
    <View className="gap-3">
      {chats.map((chat) => (
        <Card className="p-3" key={chat.name}>
          <View className="flex-row items-center gap-3">
            <Avatar>
              <AvatarFallback>{chat.initials}</AvatarFallback>
            </Avatar>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-ink">{chat.name}</Text>
                <Text className="text-xs font-semibold text-slate-400">{chat.time}</Text>
              </View>
              <Text className="mt-1 text-sm leading-5 text-slate-500" numberOfLines={2}>
                {chat.last}
              </Text>
            </View>
            {chat.unread ? <View className="h-3 w-3 rounded-full bg-coral" /> : null}
          </View>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick reply</CardTitle>
          <CardDescription>Keep the conversation moving after a match.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button action="primary" className="rounded-2xl">
            <ButtonIcon as={Send} />
            <ButtonText>Ask about room rules</ButtonText>
          </Button>
        </CardContent>
      </Card>
    </View>
  );
}

function ProfileScreen({ liked }: { liked: string[] }) {
  return (
    <View className="gap-4">
      <Card>
        <View className="flex-row items-center gap-4">
          <Avatar size="lg" className="bg-coral">
            <AvatarFallback className="text-2xl text-white">RM</AvatarFallback>
          </Avatar>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-ink">Rommie Student</Text>
            <Text className="mt-1 text-sm text-slate-500">
              Looking near campus, flexible budget, quiet weekdays.
            </Text>
          </View>
        </View>
      </Card>

      <View className="flex-row gap-3">
        {profileStats.map(([value, label]) => (
          <Card className="flex-1 items-center p-3" key={label}>
            <Text className="text-2xl font-bold text-ink">{value}</Text>
            <Text className="mt-1 text-center text-xs font-semibold text-slate-500">{label}</Text>
          </Card>
        ))}
      </View>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Saved matches</CardTitle>
          <CardDescription>
            {liked.length > 0 ? liked.join(", ") : "Like a student to start a shortlist."}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <View className="flex-row items-center gap-2">
            <CheckCircle2 color="#14b8a6" size={18} />
            <Text className="text-sm font-semibold text-slate-600">Verified student account</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <CheckCircle2 color="#14b8a6" size={18} />
            <Text className="text-sm font-semibold text-slate-600">
              Roommate preferences completed
            </Text>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}

type BottomTabsProps = {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
};

function BottomTabs({ activeTab, onChange }: BottomTabsProps) {
  const tabs = [
    { icon: Home, key: "match" as const, label: "Match" },
    { icon: MessageCircle, key: "chat" as const, label: "Chat" },
    { icon: User, key: "profile" as const, label: "Profile" },
  ];

  return (
    <View className="mt-2 flex-row rounded-2xl border border-slate-200 bg-white p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.key;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={cn(
              "h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl",
              active && "bg-ink",
            )}
            key={tab.key}
            onPress={() => onChange(tab.key)}
          >
            <Icon color={active ? "#ffffff" : "#64748b"} size={18} strokeWidth={2.4} />
            <Text className={cn("text-sm font-semibold", active ? "text-white" : "text-slate-500")}>
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
