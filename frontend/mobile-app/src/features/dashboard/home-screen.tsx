import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { Bookmark, ChevronRight, ClipboardList, Heart, UserPlus } from "lucide-react-native";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { MatchScore } from "@/components/match-score";
import { QueryState } from "@/components/query-state";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { UserAvatar } from "@/components/user-avatar";
import { getGivenName, useAuthStore } from "@/features/auth";
import { matchingApi } from "@/features/matching";
import { openProfile } from "@/features/matching/components/match-card";
import {
  MatchRequestItem,
  useRespondToRequest,
} from "@/features/matching/components/match-requests";
import { MatchingRefresh } from "@/features/matching/components/matching-refresh";
import { profileApi, savedProfilesApi } from "@/features/profile";
import { useMyQuiz } from "@/features/quiz";
import { colors } from "@/theme/colors";
import { goToTab } from "@/components/stack-header";

// Bản mobile của DashboardScreen trên web (phần ghép đôi). Tin nhắn, dịch vụ và gói thành viên
// được thêm ở các giai đoạn sau.
export function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const me = user?.id;
  const profile = useQuery({ queryKey: ["profile", "me", me], queryFn: profileApi.getMine });
  const matches = useQuery({
    queryKey: ["matching", "dashboard", me],
    queryFn: () => matchingApi.list({ pageSize: 4 }),
  });
  const saved = useQuery({
    queryKey: ["saved-profiles", "dashboard", me],
    queryFn: () => savedProfilesApi.list(),
  });
  const requests = useQuery({
    queryKey: ["match-requests", me, "dashboard"],
    queryFn: () => matchingApi.requests(1),
  });
  const quiz = useMyQuiz();
  const respond = useRespondToRequest();

  // Quay lại tab là thấy kết quả mới nhất (sau khi quét hoặc lưu hồ sơ ở màn khác).
  const refetchMatches = matches.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetchMatches();
    }, [refetchMatches]),
  );

  const name = getGivenName(profile.data?.displayName ?? user?.displayName) || "bạn";
  const pendingIncoming =
    requests.data?.items.filter((r) => r.status === "pending" && r.direction === "incoming")
      .length ?? 0;
  const stats = [
    { label: "Phù hợp", value: matches.data?.totalCount, query: matches, href: "/matches" },
    { label: "Đã lưu", value: saved.data?.totalCount, query: saved, href: "/saved" },
    { label: "Đề nghị", value: requests.data?.totalCount, query: requests, href: "/requests" },
  ] as const;

  return (
    <View className="gap-4">
      <Card className="border-0 bg-navy p-5">
        <Text className="text-3xl font-bold leading-9 text-white">
          Chào mừng trở lại, {name} 👋
        </Text>
        <Text className="mt-2 text-sm leading-5 text-slate-200">
          Tìm người phù hợp và theo dõi hành trình ở ghép của bạn.
        </Text>
        <Button action="secondary" className="mt-5 rounded-2xl" onPress={() => goToTab("/matches")}>
          <ButtonText>Khám phá ở ghép</ButtonText>
          <ButtonIcon as={ChevronRight} />
        </Button>
      </Card>

      <View className="flex-row gap-3">
        {stats.map((stat) => (
          <Pressable
            key={stat.label}
            accessibilityRole="button"
            accessibilityLabel={`${stat.label}: ${stat.value ?? "đang tải"}`}
            onPress={() => router.push(stat.href)}
            className="flex-1"
          >
            <Card className="items-center p-3">
              <Text className="text-2xl font-bold text-navy">
                {stat.query.isError ? "—" : (stat.value ?? "…")}
              </Text>
              <Text className="mt-1 text-center text-xs font-semibold text-slate-500">
                {stat.label}
              </Text>
            </Card>
          </Pressable>
        ))}
      </View>

      {pendingIncoming ? (
        <Pressable accessibilityRole="button" onPress={() => router.push("/requests")}>
          <Card className="flex-row items-center gap-3 border-teal/30 bg-mint/20">
            <UserPlus color={colors.teal} size={22} />
            <Text className="flex-1 text-sm font-semibold text-navy">
              Bạn có {pendingIncoming} đề nghị ở ghép đang chờ trả lời.
            </Text>
            <ChevronRight color={colors.teal} size={18} />
          </Card>
        </Pressable>
      ) : null}

      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-ink">Hoàn thiện hồ sơ</Text>
          <Text className="font-bold text-teal">
            {profile.data ? `${profile.data.profileCompletion}%` : "…"}
          </Text>
        </View>
        <QueryState query={profile} />
        {profile.data ? (
          <>
            <ProgressBar value={profile.data.profileCompletion} />
            <View className="flex-row flex-wrap gap-2">
              <Chip done label="Thông tin cơ bản" />
              <Chip
                done={Boolean(quiz.data)}
                label="Khảo sát lối sống"
                onPress={() => router.push("/quiz")}
              />
              <Chip done={Boolean(profile.data.avatarUrl)} label="Ảnh đại diện" />
              <Chip done={profile.data.isVerified} label="Xác minh" />
            </View>
          </>
        ) : null}
      </Card>

      <MatchingRefresh openResults />

      <View className="flex-row items-center justify-between px-1">
        <Text className="text-lg font-bold text-ink">Gợi ý cho bạn</Text>
        <Pressable onPress={() => goToTab("/matches")}>
          <Text className="font-semibold text-teal">Xem tất cả</Text>
        </Pressable>
      </View>
      <QueryState query={matches} />
      {matches.data?.totalCount === 0 ? (
        <Card className="items-center gap-2">
          <Heart color={colors.teal} size={22} />
          <Text className="text-center text-sm text-slate-500">
            Chưa có kết quả ghép đôi. Bấm "Tìm / cập nhật người phù hợp" để tạo danh sách.
          </Text>
        </Card>
      ) : null}
      {matches.data?.items.map((match) => (
        <Pressable
          key={match.id}
          accessibilityRole="button"
          accessibilityLabel={`Xem hồ sơ ${match.name}, phù hợp ${match.score}%`}
          onPress={() => openProfile(match.id)}
        >
          <Card className="flex-row items-center gap-3">
            <UserAvatar name={match.name} avatarUrl={match.avatarUrl} />
            <View className="min-w-0 flex-1">
              <Text className="text-base font-bold text-ink" numberOfLines={1}>
                {match.name}
                {match.age !== null ? `, ${match.age}` : ""}
              </Text>
              <Text className="text-sm text-slate-500" numberOfLines={1}>
                {[match.occupation, match.district ?? match.city].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <MatchScore value={match.score} compact />
          </Card>
        </Pressable>
      ))}

      <View className="flex-row items-center justify-between px-1">
        <Text className="text-lg font-bold text-ink">Đề nghị ở ghép</Text>
        <Pressable onPress={() => router.push("/requests")}>
          <Text className="font-semibold text-teal">Xem tất cả</Text>
        </Pressable>
      </View>
      <QueryState query={requests} />
      {requests.data?.totalCount === 0 ? (
        <Text className="px-1 text-sm text-slate-500">
          Chưa có đề nghị. Mở một hồ sơ phù hợp và bấm "Đề nghị ở ghép".
        </Text>
      ) : null}
      {requests.data?.items.slice(0, 3).map((request) => (
        <MatchRequestItem key={request.id} request={request} respond={respond} />
      ))}

      <Pressable accessibilityRole="button" onPress={() => router.push("/saved")}>
        <Card className="flex-row items-center gap-3">
          <Bookmark color={colors.navy} size={20} />
          <Text className="flex-1 text-base font-semibold text-ink">Hồ sơ đã lưu</Text>
          <ChevronRight color={colors.teal} size={18} />
        </Card>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push("/quiz")}>
        <Card className="flex-row items-center gap-3">
          <ClipboardList color={colors.navy} size={20} />
          <Text className="flex-1 text-base font-semibold text-ink">
            {quiz.data ? "Kết quả khảo sát lối sống" : "Làm khảo sát lối sống"}
          </Text>
          <ChevronRight color={colors.teal} size={18} />
        </Card>
      </Pressable>
    </View>
  );
}

function Chip({ done, label, onPress }: { done: boolean; label: string; onPress?: () => void }) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : "text"}
      className={
        done ? "rounded-full bg-mint/30 px-3 py-1.5" : "rounded-full bg-slate-100 px-3 py-1.5"
      }
    >
      <Text className={done ? "text-xs font-semibold text-navy" : "text-xs text-slate-500"}>
        {done ? `✓ ${label}` : label}
      </Text>
    </Pressable>
  );
}
