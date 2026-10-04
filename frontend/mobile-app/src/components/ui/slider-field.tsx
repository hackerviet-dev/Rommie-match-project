import Slider from "@react-native-community/slider";
import { Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function SliderField({
  value,
  onChange,
  min,
  max,
  step = 1,
  leftLabel,
  rightLabel,
  accessibilityLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  leftLabel?: string;
  rightLabel?: string;
  accessibilityLabel: string;
}) {
  return (
    <View>
      <Slider
        accessibilityLabel={accessibilityLabel}
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={(next) => onChange(Math.round(next / step) * step)}
        minimumTrackTintColor={colors.teal}
        maximumTrackTintColor="#cbd5e1"
        thumbTintColor={colors.navy}
        style={{ height: 40 }}
      />
      {leftLabel || rightLabel ? (
        <View className="flex-row justify-between">
          <Text className="text-xs text-slate-500">{leftLabel}</Text>
          <Text className="text-xs text-slate-500">{rightLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}
