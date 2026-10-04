import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { CalendarDays } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";
import { Button, ButtonText } from "./button";
import { Input } from "./input";

const pad = (value: number) => String(value).padStart(2, "0");
// Giá trị luôn là chuỗi "YYYY-MM-DD" như input type="date" của web; Date dùng giờ địa phương
// để ngày không bị lệch khi đổi múi giờ.
const toDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};
const toValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const toLabel = (value: string) => value.split("-").reverse().join("/");

export function DateField({
  value,
  onChange,
  minimumDate,
  invalid,
  placeholder = "Chọn ngày",
}: {
  value: string;
  onChange: (value: string) => void;
  minimumDate?: string;
  invalid?: boolean;
  placeholder?: string;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const min = minimumDate ? (toDate(minimumDate) ?? undefined) : undefined;
  const current = toDate(value) ?? min ?? new Date();

  // Bản web của Expo chỉ để thử: không có lịch native, nhập tay theo định dạng của API.
  if (Platform.OS === "web")
    return (
      <Input
        value={value}
        onChangeText={onChange}
        invalid={invalid}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
    );

  function open() {
    if (Platform.OS === "android")
      DateTimePickerAndroid.open({
        value: current,
        mode: "date",
        minimumDate: min,
        onValueChange: (_event, date) => onChange(toValue(date)),
      });
    else setIosOpen((shown) => !shown);
  }

  return (
    <View className="gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `Ngày đã chọn ${toLabel(value)}` : placeholder}
        onPress={open}
        className={cn(
          "h-12 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4",
          invalid && "border-red-400",
        )}
      >
        <Text className={cn("text-base", value ? "text-ink" : "text-slate-400")}>
          {value ? toLabel(value) : placeholder}
        </Text>
        <CalendarDays color={colors.slate500} size={18} />
      </Pressable>
      {Platform.OS === "ios" && iosOpen ? (
        <View className="rounded-2xl bg-white p-2">
          <DateTimePicker
            value={current}
            mode="date"
            display="inline"
            minimumDate={min}
            locale="vi-VN"
            accentColor={colors.teal}
            onValueChange={(_event, date) => onChange(toValue(date))}
          />
          <Button action="secondary" size="sm" onPress={() => setIosOpen(false)}>
            <ButtonText>Xong</ButtonText>
          </Button>
        </View>
      ) : null}
    </View>
  );
}
