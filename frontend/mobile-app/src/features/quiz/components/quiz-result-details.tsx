import { Text, View } from "react-native";
import { Badge, BadgeText } from "@/components/ui/badge";
import type { QuizResult } from "../types/quiz-types";

const COST_SPLIT: Record<string, string> = {
  split_evenly: "Chia đều",
  itemize: "Tính theo từng khoản",
  each_pays: "Ai mua người đó trả",
};

export function QuizResultDetails({ result }: { result: QuizResult }) {
  return (
    <View className="gap-4">
      <Text className="text-sm text-slate-500">
        Cập nhật: {new Date(result.updatedAt).toLocaleString("vi-VN")}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {result.tags.map((tag) => (
          <Badge key={tag} action="success">
            <BadgeText action="success">{tag}</BadgeText>
          </Badge>
        ))}
      </View>
      <View className="flex-row gap-3">
        {(
          [
            ["Chịu ồn", result.traits.noiseTolerance],
            ["Gọn gàng", result.traits.tidiness],
            ["Dậy sớm", result.traits.earlyBird],
          ] as const
        ).map(([label, value]) => (
          <View key={label} className="flex-1 rounded-xl bg-slate-100 p-3">
            <Text className="text-xs text-slate-500">{label}</Text>
            <Text className="mt-1 text-base font-bold text-navy">{value}/100</Text>
          </View>
        ))}
      </View>
      <Text className="text-sm text-ink">
        Chia chi phí:{" "}
        <Text className="font-semibold">
          {COST_SPLIT[result.traits.costSplit] ?? result.traits.costSplit}
        </Text>
      </Text>
    </View>
  );
}
