import { Pressable, Text, View } from "react-native";
import { cn } from "@/lib/cn";

export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ label: string; value: T }>;
  value: T | null | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.value)}
            className={cn(
              "rounded-full border px-4 py-2.5",
              selected ? "border-teal bg-teal" : "border-slate-200 bg-white",
            )}
          >
            <Text className={cn("text-sm font-semibold", selected ? "text-white" : "text-ink")}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
