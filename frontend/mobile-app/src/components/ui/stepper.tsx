import { Minus, Plus } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";

// Chọn số nguyên trong khoảng [min, max] bằng hai nút -/+.
export function Stepper({
  value,
  onChange,
  min,
  max,
  format = String,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  format?: (value: number) => string;
  label: string;
}) {
  const button = (icon: typeof Minus, next: number, disabled: boolean, name: string) => {
    const Icon = icon;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name} ${label}`}
        disabled={disabled}
        onPress={() => onChange(next)}
        className={cn(
          "h-10 w-10 items-center justify-center rounded-full bg-mint/30",
          disabled && "opacity-40",
        )}
      >
        <Icon color={colors.navy} size={18} />
      </Pressable>
    );
  };
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-2 py-1.5">
      {button(Minus, value - 1, value <= min, "Giảm")}
      <Text
        accessibilityLabel={`${label}: ${format(value)}`}
        className="text-base font-bold text-navy"
      >
        {format(value)}
      </Text>
      {button(Plus, value + 1, value >= max, "Tăng")}
    </View>
  );
}
