import { ActivityIndicator, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { Button, ButtonText } from "./ui/button";
import { FormError } from "./ui/form-field";

// Trạng thái đang tải / lỗi chung cho một query, giống QueryState của web.
export function QueryState({
  query,
  loadingText = "Đang tải…",
}: {
  query: { isPending: boolean; isError: boolean; error: Error | null; refetch: () => unknown };
  loadingText?: string;
}) {
  if (query.isPending)
    return (
      <View accessibilityRole="progressbar" className="flex-row items-center gap-2 py-4">
        <ActivityIndicator color={colors.teal} />
        <Text className="text-sm text-slate-500">{loadingText}</Text>
      </View>
    );
  if (query.isError)
    return (
      <View className="gap-3 py-3">
        <FormError message={query.error?.message || "Không thể tải dữ liệu."} />
        <Button action="primary" variant="outline" size="sm" onPress={() => void query.refetch()}>
          <ButtonText>Thử lại</ButtonText>
        </Button>
      </View>
    );
  return null;
}
