import { ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonGroup, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchScore } from "@/components/match-score";
import { roommates } from "@/mocks/mock-data";

export function HomeScreen({ onOpenMatches }: { onOpenMatches: () => void }) {
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
        <Button action="secondary" className="mt-5 rounded-2xl" onPress={onOpenMatches}>
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
            <Text className="mt-1 text-center text-xs font-semibold text-slate-500">{label}</Text>
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
            <AvatarFallback className="text-navy">{roommate.initials}</AvatarFallback>
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
