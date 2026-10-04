import { router } from "expo-router";
import { CalendarDays, MapPin, Users } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { colors } from "@/theme/colors";
import { formatDate, formatVnd, propertyTypeLabel } from "../room-labels";
import type { Room } from "../types/room-types";

export const openRoom = (id: string) => router.push({ pathname: "/rooms/[id]", params: { id } });

export function RoomCard({ room }: { room: Room }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem phòng ${room.title}`}
      onPress={() => openRoom(room.id)}
    >
      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <Badge action="info" size="sm">
            <BadgeText action="info">{propertyTypeLabel(room.propertyType)}</BadgeText>
          </Badge>
          {room.roommatesNeeded ? (
            <View className="flex-row items-center gap-1">
              <Users color={colors.slate500} size={14} />
              <Text className="text-xs text-slate-500">Cần thêm {room.roommatesNeeded} người</Text>
            </View>
          ) : null}
        </View>
        <Text className="text-lg font-bold text-ink" numberOfLines={2}>
          {room.title}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <MapPin color={colors.slate500} size={14} />
          <Text className="flex-1 text-sm text-slate-500" numberOfLines={1}>
            {room.district}, {room.city}
          </Text>
        </View>
        <View className="flex-row items-end justify-between">
          <Text className="text-xl font-bold text-teal">
            {formatVnd(room.monthlyRent)}
            <Text className="text-sm font-normal text-slate-500"> / tháng</Text>
          </Text>
          <View className="flex-row items-center gap-1">
            <CalendarDays color={colors.slate500} size={14} />
            <Text className="text-xs text-slate-500">Từ {formatDate(room.availableFrom)}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
