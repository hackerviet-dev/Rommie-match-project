import { View } from "react-native";
import { cn } from "@/lib/cn";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const width = Math.min(100, Math.max(0, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: width }}
      className={cn("h-2 overflow-hidden rounded-full bg-slate-100", className)}
    >
      <View className="h-full rounded-full bg-teal" style={{ width: `${width}%` }} />
    </View>
  );
}
