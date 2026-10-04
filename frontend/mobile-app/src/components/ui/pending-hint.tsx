import { Text } from "react-native";
import { useSlowHint } from "@/hooks/use-slow-hint";

export function PendingHint({ active }: { active: boolean }) {
  const slow = useSlowHint(active);
  if (!slow) return null;
  return (
    <Text accessibilityLiveRegion="polite" className="text-center text-xs text-slate-500">
      Máy chủ đang phản hồi chậm (có thể đang khởi động), vui lòng chờ tối đa 1 phút…
    </Text>
  );
}
