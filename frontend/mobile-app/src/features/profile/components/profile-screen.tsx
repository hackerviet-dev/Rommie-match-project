import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Bookmark,
  Briefcase,
  Flag,
  Lock,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Slash,
  UserPlus,
} from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { FormScreen } from "@/components/form-screen";
import { MatchScore } from "@/components/match-score";
import { QueryState } from "@/components/query-state";
import { StackHeader } from "@/components/stack-header";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/form-field";
import { UserAvatar } from "@/components/user-avatar";
import { useAuthStore } from "@/features/auth";
import { useStartChat } from "@/features/chat";
import { BreakdownBars } from "@/features/matching/components/breakdown-bars";
import { matchingApi } from "@/features/matching/services/matching-api";
import { ApiError } from "@/services/api-error";
import { colors } from "@/theme/colors";
import { useSavedProfiles } from "../hooks/use-saved-profiles";
import { profileApi } from "../services/profile-api";
import { safetyApi } from "../services/safety-api";
import { ReportDialog } from "./report-dialog";

const formatVnd = (value: number) => value.toLocaleString("vi-VN");

export function ProfileScreen({ id }: { id: string }) {
  const me = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const saved = useSavedProfiles();
  const isMe = id === me;
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const profile = useQuery({
    queryKey: ["profile", "public", me, id],
    queryFn: () => profileApi.getByUserId(id),
    enabled: Boolean(id),
  });
  const detail = useQuery({
    queryKey: ["matching", "detail", me, id],
    queryFn: async () => {
      try {
        return await matchingApi.detail(id);
      } catch (error) {
        // Chưa có điểm ghép đôi với người này (chưa quét): vẫn xem được hồ sơ.
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(id) && !isMe,
  });
  const chat = useStartChat();
  const request = useMutation({
    mutationFn: () => matchingApi.request(id),
    onSuccess: () => {
      setNotice("Đã gửi đề nghị ở ghép.");
      void client.invalidateQueries({ queryKey: ["match-requests"] });
    },
  });
  const block = useMutation({
    mutationFn: () => safetyApi.block(id),
    onSuccess: () => {
      setBlockOpen(false);
      onBlocked();
    },
  });
  function onBlocked() {
    setBlocked(true);
    for (const key of ["matching", "saved-profiles", "match-requests", "chat"])
      void client.invalidateQueries({ queryKey: [key] });
  }

  if (blocked)
    return (
      <FormScreen>
        <StackHeader title="Hồ sơ" />
        <Card className="mt-6 items-center gap-3 p-6">
          <Slash color={colors.navy} size={28} />
          <Text className="text-xl font-bold text-ink">Đã chặn thành viên</Text>
          <Text className="text-center text-sm text-slate-500">
            Người này sẽ không còn xuất hiện trong kết quả ghép đôi và không nhắn tin được cho bạn.
          </Text>
          <Button action="primary" className="mt-2 h-11 w-full" onPress={() => router.back()}>
            <ButtonText>Quay lại</ButtonText>
          </Button>
        </Card>
      </FormScreen>
    );

  const p = profile.isError ? undefined : profile.data;
  const match = detail.data?.match;
  const isSaved = saved.ids.includes(id);
  return (
    <FormScreen>
      <StackHeader title={p?.displayName ?? "Hồ sơ"} />
      <QueryState query={profile} loadingText="Đang tải hồ sơ…" />
      {p ? (
        <View className="mt-4 gap-4">
          <Card className="items-center gap-2 p-6">
            <UserAvatar
              size="lg"
              name={p.displayName}
              avatarUrl={p.avatarUrl}
              className="h-24 w-24 border-4 border-mint"
              textClassName="text-3xl"
            />
            <Text className="mt-2 text-center text-2xl font-bold text-ink">{p.displayName}</Text>
            <View className="flex-row items-center gap-1.5">
              <Briefcase color={colors.slate500} size={14} />
              <Text className="text-sm text-slate-500">
                {p.occupation || "Chưa cập nhật công việc"}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <MapPin color={colors.slate500} size={14} />
              <Text className="text-sm text-slate-500">
                {[p.district, p.city].filter(Boolean).join(" · ")}
              </Text>
            </View>
            {p.isVerified ? (
              <View className="flex-row items-center gap-1">
                <ShieldCheck color={colors.teal} size={14} />
                <Text className="text-sm text-teal">Đã xác minh</Text>
              </View>
            ) : null}
            {match ? (
              <View className="mt-2 items-center gap-1">
                <MatchScore value={match.score} />
                <Text className="text-xs text-slate-500">mức độ phù hợp</Text>
              </View>
            ) : null}

            {!isMe ? (
              <View className="mt-4 w-full gap-2">
                <Button
                  action="primary"
                  className="h-11"
                  loading={chat.isPending}
                  onPress={() => chat.mutate(id)}
                >
                  <ButtonIcon as={MessageCircle} />
                  <ButtonText>Nhắn tin</ButtonText>
                </Button>
                <Button
                  action={isSaved ? "primary" : "secondary"}
                  variant={isSaved ? "outline" : "solid"}
                  className="h-11"
                  disabled={saved.query.isPending || saved.query.isError}
                  loading={saved.mutation.isPending}
                  onPress={() => saved.mutation.mutate({ id, saved: !isSaved })}
                >
                  <ButtonIcon as={Bookmark} />
                  <ButtonText>{isSaved ? "Bỏ lưu hồ sơ" : "Lưu hồ sơ"}</ButtonText>
                </Button>
                <Button
                  action="primary"
                  variant="outline"
                  className="h-11"
                  loading={request.isPending}
                  onPress={() => request.mutate()}
                >
                  <ButtonIcon as={UserPlus} />
                  <ButtonText>Đề nghị ở ghép</ButtonText>
                </Button>
                <View className="flex-row gap-2">
                  <Button
                    action="muted"
                    variant="outline"
                    className="h-11 flex-1"
                    onPress={() => setReportOpen(true)}
                  >
                    <ButtonIcon as={Flag} />
                    <ButtonText>Báo cáo</ButtonText>
                  </Button>
                  <Button
                    action="muted"
                    variant="outline"
                    className="h-11 flex-1 border-red-300"
                    onPress={() => setBlockOpen(true)}
                  >
                    <ButtonIcon as={Slash} />
                    <ButtonText className="text-red-600">Chặn</ButtonText>
                  </Button>
                </View>
                {notice ? <Text className="text-center text-sm text-teal">{notice}</Text> : null}
                <FormError
                  message={
                    chat.error?.message ?? request.error?.message ?? saved.mutation.error?.message
                  }
                />
              </View>
            ) : null}
          </Card>

          {match ? (
            <Card className="gap-3">
              <Text className="text-lg font-bold text-ink">Mong muốn nơi ở</Text>
              <Text className="text-sm text-slate-600">
                Khu vực: {[match.district, match.city].filter(Boolean).join(" · ")}
              </Text>
              <Text className="text-sm text-slate-600">
                Ngân sách: {formatVnd(match.budgetMin)}–{formatVnd(match.budgetMax)}₫/tháng
              </Text>
              <Text className="mt-1 text-sm font-semibold text-ink">Sở thích & đam mê</Text>
              {match.interests.length ? (
                <View className="flex-row flex-wrap gap-1.5">
                  {match.interests.map((interest) => (
                    <Badge key={interest} action="success" size="sm">
                      <BadgeText action="success">{interest}</BadgeText>
                    </Badge>
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-slate-500">Chưa có sở thích được chia sẻ.</Text>
              )}
            </Card>
          ) : null}

          <Card className="gap-2">
            <Text className="text-lg font-bold text-ink">Giới thiệu</Text>
            <Text className="text-sm leading-6 text-slate-600">
              {p.bio || "Chưa có giới thiệu."}
            </Text>
          </Card>

          {!isMe ? <QueryState query={detail} loadingText="Đang tải mức độ phù hợp…" /> : null}
          {detail.data === null ? (
            <Card>
              <Text className="text-sm text-slate-500">
                Chưa có điểm phù hợp với người này. Quét lại ở tab Ghép đôi để cập nhật.
              </Text>
            </Card>
          ) : null}
          {detail.data && match ? (
            <Card className="gap-4">
              <Text className="text-lg font-bold text-ink">Mức độ phù hợp</Text>
              {match.explanation ? (
                <Text className="text-sm leading-5 text-slate-600">{match.explanation}</Text>
              ) : null}
              <BreakdownBars items={match.breakdown} />
              {detail.data.comparisonLocked ? (
                <View className="flex-row items-center gap-2 rounded-xl bg-mint/20 p-3">
                  <Lock color={colors.navy} size={16} />
                  <Text className="flex-1 text-sm text-navy">
                    <Text
                      className="font-bold underline"
                      onPress={() => router.navigate("/premium")}
                    >
                      Premium
                    </Text>{" "}
                    mở so sánh chi tiết hai hồ sơ.
                  </Text>
                </View>
              ) : detail.data.comparison?.length ? (
                <View className="overflow-hidden rounded-xl border border-slate-100">
                  <View className="flex-row bg-slate-50 px-3 py-2">
                    <Text className="flex-1 text-xs font-bold text-slate-600">Tiêu chí</Text>
                    <Text className="w-24 text-center text-xs font-bold text-slate-600">Bạn</Text>
                    <Text
                      className="w-24 text-center text-xs font-bold text-slate-600"
                      numberOfLines={1}
                    >
                      {p.displayName}
                    </Text>
                  </View>
                  {detail.data.comparison.map((row) => (
                    <View key={row.key} className="flex-row border-t border-slate-100 px-3 py-2.5">
                      <Text className="flex-1 text-sm text-ink">{row.label}</Text>
                      <Text className="w-24 text-center text-sm text-ink">{row.mine}</Text>
                      <Text className="w-24 text-center text-sm text-ink">{row.theirs}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <Text className="text-xs text-slate-500">
                Tính lúc {new Date(detail.data.calculatedAt).toLocaleString("vi-VN")}
              </Text>
            </Card>
          ) : null}
        </View>
      ) : null}

      {!isMe ? (
        <>
          <ReportDialog
            userId={id}
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            onReported={() => setNotice("Đã gửi báo cáo. Cảm ơn bạn.")}
            onBlocked={onBlocked}
          />
          <ConfirmDialog
            open={blockOpen}
            title={`Chặn ${p?.displayName ?? "thành viên"}?`}
            description="Hai bạn sẽ không thấy nhau trong kết quả ghép đôi và không nhắn tin được. Bạn có thể bỏ chặn sau."
            confirmLabel="Chặn"
            destructive
            loading={block.isPending}
            onConfirm={() => block.mutate()}
            onClose={() => setBlockOpen(false)}
          >
            <FormError message={block.error?.message} />
          </ConfirmDialog>
        </>
      ) : null}
    </FormScreen>
  );
}
