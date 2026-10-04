import { router } from "expo-router";
import { Bookmark, MapPin, ShieldCheck } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { MatchScore } from "@/components/match-score";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { useSavedProfiles } from "@/features/profile";
import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";
import type { RoommateMatch } from "../types/matching-types";
import { BreakdownBars } from "./breakdown-bars";

export const openProfile = (id: string) =>
  router.push({ pathname: "/profile/[id]", params: { id } });

export function MatchCard({ match }: { match: RoommateMatch }) {
  const saved = useSavedProfiles();
  const isSaved = saved.ids.includes(match.id);
  const location = [match.district, match.city].filter(Boolean).join(", ");
  return (
    <Card className="gap-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem hồ sơ ${match.name}, phù hợp ${match.score}%`}
        onPress={() => openProfile(match.id)}
        className="flex-row items-center gap-3"
      >
        <UserAvatar size="lg" name={match.name} avatarUrl={match.avatarUrl} />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="shrink text-lg font-bold text-ink" numberOfLines={1}>
              {match.name}
              {match.age !== null ? `, ${match.age}` : ""}
            </Text>
            {match.isVerified ? <ShieldCheck color={colors.teal} size={16} /> : null}
          </View>
          {match.occupation ? (
            <Text className="text-sm text-slate-500" numberOfLines={1}>
              {match.occupation}
            </Text>
          ) : null}
          <View className="mt-0.5 flex-row items-center gap-1">
            <MapPin color={colors.slate500} size={13} />
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              {location}
            </Text>
          </View>
        </View>
        <MatchScore value={match.score} compact />
      </Pressable>
      {match.explanation ? (
        <Text className="text-sm leading-5 text-ink">{match.explanation}</Text>
      ) : null}
      {match.interests.length ? (
        <View className="flex-row flex-wrap gap-1.5">
          {match.interests.slice(0, 3).map((interest) => (
            <Badge key={interest} action="success" size="sm">
              <BadgeText action="success">{interest}</BadgeText>
            </Badge>
          ))}
        </View>
      ) : null}
      <BreakdownBars items={match.breakdown.slice(0, 3)} />
      <View className="flex-row gap-2">
        <Button
          action="primary"
          variant="outline"
          className="h-11 flex-1"
          onPress={() => openProfile(match.id)}
        >
          <ButtonText>Xem hồ sơ</ButtonText>
        </Button>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${isSaved ? "Bỏ lưu" : "Lưu"} hồ sơ ${match.name}`}
          accessibilityState={{ selected: isSaved }}
          disabled={saved.query.isPending || saved.query.isError || saved.mutation.isPending}
          onPress={() => saved.mutation.mutate({ id: match.id, saved: !isSaved })}
          className={cn(
            "h-11 w-11 items-center justify-center rounded-xl border",
            isSaved ? "border-navy bg-navy" : "border-slate-200 bg-white",
          )}
        >
          <Bookmark
            color={isSaved ? "#ffffff" : colors.navy}
            fill={isSaved ? "#ffffff" : "transparent"}
            size={18}
          />
        </Pressable>
      </View>
      {saved.mutation.isError ? (
        <Text className="text-xs text-red-600">{saved.mutation.error.message}</Text>
      ) : null}
    </Card>
  );
}
