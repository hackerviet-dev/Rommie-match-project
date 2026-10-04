import { Text, View } from "react-native";
import { cn } from "@/lib/cn";

export function MatchScore({ value, compact = false }: { value: number; compact?: boolean }) {
  return (
    <View
      className={cn(
        "items-center justify-center rounded-full border-4 border-teal bg-white",
        compact ? "h-14 w-14" : "h-16 w-16",
      )}
    >
      <Text className={cn("font-bold text-navy", compact ? "text-base" : "text-lg")}>{value}%</Text>
    </View>
  );
}
