import { Text, View } from "react-native";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { RoommateMatch } from "../types/matching-types";

export function BreakdownBars({ items }: { items: RoommateMatch["breakdown"] }) {
  return (
    <View className="gap-3">
      {items.map((item) => (
        <View key={item.key} className="gap-1">
          <View className="flex-row justify-between">
            <Text className="text-xs text-slate-600">{item.label}</Text>
            <Text className="text-xs font-semibold text-navy">{item.value}%</Text>
          </View>
          <ProgressBar value={item.value} className="h-1.5" />
        </View>
      ))}
    </View>
  );
}
