import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react-native";
import { Text, View } from "react-native";
import { QueryState } from "@/components/query-state";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-field";
import { useAuthStore } from "@/features/auth";
import { colors } from "@/theme/colors";
import { matchingApi } from "../services/matching-api";
import { goToTab } from "@/components/stack-header";

// Quét lại người phù hợp (POST /api/matching/me/recalculate); gói miễn phí có giới hạn lượt.
export function MatchingRefresh({ openResults = false }: { openResults?: boolean }) {
  const userId = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const usage = useQuery({
    queryKey: ["matching", "usage", userId],
    queryFn: matchingApi.usage,
  });
  const refresh = useMutation({
    mutationFn: matchingApi.recalculate,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["matching"] });
      if (openResults) goToTab("/matches");
    },
  });
  const outOfScans = usage.data?.scansRemaining === 0;
  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-2">
        <Sparkles color={colors.teal} size={18} />
        <Text className="flex-1 text-base font-bold text-ink">Tìm người phù hợp</Text>
      </View>
      <Text className="text-sm leading-5 text-slate-500">
        So sánh hồ sơ của bạn với các thành viên khác. Mỗi lần quét có ứng viên được chấm điểm sẽ
        dùng một lượt.
      </Text>
      <QueryState query={usage} />
      {usage.data ? (
        <Text className="text-sm text-ink">
          Lượt còn lại:{" "}
          <Text className="font-bold">{usage.data.scansRemaining ?? "Không giới hạn"}</Text> · Làm
          mới {new Date(usage.data.periodResetsAt).toLocaleDateString("vi-VN")}
        </Text>
      ) : null}
      <FormError message={refresh.error?.message} />
      {refresh.isSuccess ? (
        <Text className="text-sm text-teal">
          Đã chấm điểm {refresh.data.candidatesScored} ứng viên.
        </Text>
      ) : null}
      <Button
        action="secondary"
        className="h-11"
        disabled={!usage.data || outOfScans}
        loading={refresh.isPending}
        onPress={() => refresh.mutate()}
      >
        <ButtonText>{refresh.isPending ? "Đang tìm…" : "Tìm / cập nhật người phù hợp"}</ButtonText>
      </Button>
      {outOfScans ? (
        <Button
          action="primary"
          variant="outline"
          className="h-11"
          onPress={() => goToTab("/premium")}
        >
          <ButtonText>Hết lượt quét · Xem Premium</ButtonText>
        </Button>
      ) : null}
    </Card>
  );
}
