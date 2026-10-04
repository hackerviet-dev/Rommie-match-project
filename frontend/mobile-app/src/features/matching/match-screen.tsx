import { Heart, MapPin, ShieldCheck, Sparkles, X } from "lucide-react-native";
import { Text, View } from "react-native";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonGroup, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchScore } from "@/components/match-score";
import type { Roommate } from "@/mocks/mock-data";
import { colors } from "@/theme/colors";

export function MatchScreen({
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
          <Text className="text-2xl font-bold text-ink">Kết quả phù hợp nhất</Text>
          <Text className="mt-1 text-sm text-slate-500">Xếp hạng theo điểm tương thích AI.</Text>
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
              <AvatarFallback className="text-xl text-navy">{roommate.initials}</AvatarFallback>
            </Avatar>
            <Text className="text-3xl font-bold text-white">
              {roommate.name}, {roommate.age}
            </Text>
            <Text className="mt-1 font-semibold text-mint">{roommate.occupation}</Text>
            <View className="mt-3 flex-row items-center gap-2">
              <MapPin color={colors.mint} size={17} />
              <Text className="text-sm text-white">{roommate.neighborhood}</Text>
            </View>
            <Text className="mt-4 text-sm leading-5 text-slate-200">{roommate.vibe}</Text>
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
            <Button action="secondary" className="h-14 flex-1 rounded-2xl" onPress={onLike}>
              <ButtonIcon as={Heart} />
              <ButtonText>Quan tâm</ButtonText>
            </Button>
          </ButtonGroup>
        </View>
      </Card>
      <View className="flex-row gap-3">
        <Card className="flex-1">
          <ShieldCheck color={colors.teal} size={20} />
          <CardTitle className="mt-2 text-base">Đã xác minh</CardTitle>
          <CardDescription>Danh tính và trường học</CardDescription>
        </Card>
        <Card className="flex-1">
          <Sparkles color={colors.navy} size={20} />
          <CardTitle className="mt-2 text-base">AI phân tích</CardTitle>
          <CardDescription>12 tiêu chí lối sống</CardDescription>
        </Card>
      </View>
    </View>
  );
}
