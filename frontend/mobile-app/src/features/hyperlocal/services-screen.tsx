import { ChevronRight, Store } from "lucide-react-native";
import { Text, View } from "react-native";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonGroup, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { nearbyServices } from "@/mocks/mock-data";
import { colors } from "@/theme/colors";

export function ServicesScreen() {
  return (
    <View className="gap-3">
      <Text className="text-sm leading-5 text-slate-500">
        Các dịch vụ uy tín quanh khu vực của bạn.
      </Text>
      {nearbyServices.map((service) => {
        const Icon = service.icon;
        return (
          <Card className="flex-row items-center gap-4" key={service.name}>
            <View
              className={cn("h-12 w-12 items-center justify-center rounded-2xl", service.color)}
            >
              <Icon color={colors.navy} size={22} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-ink">{service.name}</Text>
              <Text className="mt-0.5 text-sm text-slate-500">
                {service.distance} · {service.price}
              </Text>
            </View>
            <ChevronRight color={colors.teal} size={20} />
          </Card>
        );
      })}
      <Card className="mt-1 border-0 bg-navy">
        <Store color={colors.mint} size={24} />
        <Text className="mt-3 text-xl font-bold text-white">Ổn định cuộc sống nhanh hơn</Text>
        <Text className="mt-2 text-sm leading-5 text-slate-200">
          Đặt dịch vụ địa phương đáng tin cậy ngay khi vừa dọn vào.
        </Text>
      </Card>
    </View>
  );
}
