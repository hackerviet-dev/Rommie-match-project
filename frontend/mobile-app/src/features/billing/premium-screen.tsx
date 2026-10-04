import { Check, ShieldCheck, Sparkles, Star } from "lucide-react-native";
import { Text, View } from "react-native";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonGroup, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { colors } from "@/theme/colors";

export function PremiumScreen() {
  const benefits = [
    "Phân tích tương thích nâng cao",
    "Quét ghép đôi không giới hạn",
    "Bộ lọc ngân sách và khu vực",
    "Boost hồ sơ — xem nhiều hơn 5 lần",
  ];
  return (
    <View className="gap-4">
      <Card className="items-center border-0 bg-navy px-5 py-7">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-mint/20">
          <Sparkles color={colors.mint} size={28} />
        </View>
        <Text className="mt-4 text-center text-3xl font-bold text-white">Ghép thông minh hơn</Text>
        <Text className="mt-2 text-center text-sm leading-5 text-slate-200">
          Tìm đúng người và dọn vào nhanh hơn với các công cụ nâng cao.
        </Text>
        <View className="mt-5 flex-row items-end">
          <Text className="text-4xl font-bold text-white">20.000₫</Text>
          <Text className="mb-1 text-mint"> / tháng</Text>
        </View>
        <Button action="secondary" className="mt-5 w-full rounded-2xl">
          <ButtonIcon as={Star} />
          <ButtonText>Nâng cấp Premium</ButtonText>
        </Button>
      </Card>
      <Card>
        <CardTitle className="text-lg">Quyền lợi Premium</CardTitle>
        <View className="mt-4 gap-4">
          {benefits.map((benefit) => (
            <View className="flex-row items-center gap-3" key={benefit}>
              <View className="h-7 w-7 items-center justify-center rounded-full bg-mint/30">
                <Check color={colors.navy} size={16} />
              </View>
              <Text className="flex-1 text-sm font-medium text-ink">{benefit}</Text>
            </View>
          ))}
        </View>
      </Card>
      <View className="flex-row items-center justify-center gap-2">
        <ShieldCheck color={colors.teal} size={16} />
        <Text className="text-xs text-slate-500">Thanh toán an toàn · Huỷ bất cứ lúc nào</Text>
      </View>
    </View>
  );
}
