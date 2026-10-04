import { router } from "expo-router";
import { CalendarDays, MapPin, Phone, ShieldCheck, Star } from "lucide-react-native";
import { Linking, Pressable, Text, View } from "react-native";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { colors } from "@/theme/colors";
import { categoryIcon } from "../categories";
import type { LocalService } from "../types/hyperlocal-types";

export const openService = (id: string) =>
  router.push({ pathname: "/services/[id]", params: { id } });

export function ServiceCard({ service }: { service: LocalService }) {
  const Icon = categoryIcon(service.category);
  return (
    <Card className="gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem dịch vụ ${service.name}`}
        onPress={() => openService(service.id)}
        className="flex-row items-start gap-3"
      >
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-mint/30">
          <Icon color={colors.navy} size={22} />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-base font-bold text-ink" numberOfLines={2}>
            {service.name}
          </Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs font-semibold text-teal">{service.category}</Text>
            {service.isVerified ? <ShieldCheck color={colors.teal} size={12} /> : null}
          </View>
          <View className="flex-row items-center gap-1">
            <MapPin color={colors.slate500} size={12} />
            <Text className="text-xs text-slate-500">
              {service.district}, {service.city}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Star color="#d97706" fill="#d97706" size={12} />
            <Text className="text-xs text-amber-700">
              {service.rating}/5 · {service.reviewCount} đánh giá
            </Text>
          </View>
        </View>
      </Pressable>
      {service.description ? (
        <Text className="text-sm leading-5 text-slate-600" numberOfLines={3}>
          {service.description}
        </Text>
      ) : null}
      <View className="flex-row justify-between rounded-xl bg-slate-50 px-3 py-2">
        <Text className="text-xs text-slate-500">Giá từ</Text>
        <Text className="text-xs font-bold text-ink">
          {service.priceFrom.toLocaleString("vi-VN")}₫
        </Text>
      </View>
      <View className="flex-row gap-2">
        <Button action="secondary" className="h-11 flex-1" onPress={() => openService(service.id)}>
          <ButtonIcon as={CalendarDays} />
          <ButtonText>Đặt lịch</ButtonText>
        </Button>
        {service.phone ? (
          <Button
            action="primary"
            variant="outline"
            className="h-11"
            accessibilityLabel={`Gọi ${service.name}`}
            onPress={() => void Linking.openURL(`tel:${service.phone}`)}
          >
            <ButtonIcon as={Phone} />
            <ButtonText>Gọi</ButtonText>
          </Button>
        ) : null}
      </View>
    </Card>
  );
}
