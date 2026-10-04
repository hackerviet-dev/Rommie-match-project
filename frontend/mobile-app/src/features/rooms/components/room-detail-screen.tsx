import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { MapPin, Pencil } from "lucide-react-native";
import { Linking, Text, View } from "react-native";
import { FormScreen } from "@/components/form-screen";
import { QueryState } from "@/components/query-state";
import { StackHeader } from "@/components/stack-header";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { useAuthStore } from "@/features/auth";
import { openProfile } from "@/features/matching/components/match-card";
import { formatDate, formatVnd, propertyTypeLabel, roomStatus } from "../room-labels";
import { roomsApi } from "../services/rooms-api";

export function RoomDetailScreen({ id }: { id: string }) {
  const me = useAuthStore((state) => state.user?.id);
  const query = useQuery({
    queryKey: ["rooms", "detail", me, id],
    queryFn: () => roomsApi.get(id),
    enabled: Boolean(id),
  });
  const room = query.isError ? undefined : query.data;
  const isOwner = room?.ownerUserId === me;
  const status = room ? roomStatus(room) : null;
  const position = room
    ? room.latitude !== null && room.longitude !== null
      ? `${room.latitude},${room.longitude}`
      : `${room.address}, ${room.district}, ${room.city}`
    : "";

  return (
    <FormScreen>
      <StackHeader title="Chi tiết phòng" />
      <QueryState query={query} loadingText="Đang tải phòng…" />
      {room && status ? (
        <View className="mt-4 gap-4">
          <Card className="gap-3">
            <View className="flex-row flex-wrap gap-2">
              <Badge action="info" size="sm">
                <BadgeText action="info">{propertyTypeLabel(room.propertyType)}</BadgeText>
              </Badge>
              <Badge action={status.action} size="sm">
                <BadgeText action={status.action}>
                  {room.moderationStatus === "approved" && room.isActive
                    ? "Đang tìm người ở ghép"
                    : status.label}
                </BadgeText>
              </Badge>
            </View>
            {isOwner && room.moderationNote ? (
              <View className="rounded-xl bg-amber-50 p-3">
                <Text className="text-sm text-amber-900">
                  Ghi chú kiểm duyệt: {room.moderationNote}
                </Text>
              </View>
            ) : null}
            <Text className="text-2xl font-bold leading-8 text-ink">{room.title}</Text>
            <View className="flex-row items-start gap-1.5">
              <MapPin color="#64748b" size={16} />
              <Text className="flex-1 text-sm text-slate-500">
                {room.address}, {room.district}, {room.city}
              </Text>
            </View>
            <Text className="text-2xl font-bold text-teal">
              {formatVnd(room.monthlyRent)}
              <Text className="text-base font-normal text-slate-500"> / tháng</Text>
            </Text>
          </Card>

          <View className="flex-row flex-wrap gap-3">
            {(
              [
                ["Tiền cọc", formatVnd(room.deposit)],
                ["Dọn vào từ", formatDate(room.availableFrom)],
                ["Số người tối đa", String(room.maxOccupants)],
                [
                  "Cần thêm",
                  room.roommatesNeeded ? `${room.roommatesNeeded} người` : "Chưa cung cấp",
                ],
                ["Diện tích", room.areaM2 ? `${room.areaM2} m²` : "Chưa cung cấp"],
                ["Phòng ngủ", room.bedrooms ? String(room.bedrooms) : "Chưa cung cấp"],
              ] as const
            ).map(([label, value]) => (
              <View key={label} className="w-[47%] grow rounded-2xl bg-white p-4">
                <Text className="text-xs text-slate-500">{label}</Text>
                <Text className="mt-1 text-base font-bold text-navy">{value}</Text>
              </View>
            ))}
          </View>

          <Card className="gap-3">
            <Text className="text-lg font-bold text-ink">Mô tả</Text>
            <Text className="text-sm leading-6 text-slate-600">
              {room.description || "Chưa có mô tả."}
            </Text>
            {room.amenities.length ? (
              <View className="flex-row flex-wrap gap-1.5">
                {room.amenities.map((amenity) => (
                  <Badge key={amenity} action="success" size="sm">
                    <BadgeText action="success">{amenity}</BadgeText>
                  </Badge>
                ))}
              </View>
            ) : null}
          </Card>

          {!isOwner ? (
            <Card className="flex-row items-center gap-3">
              <UserAvatar name={room.ownerDisplayName} avatarUrl={room.ownerAvatarUrl} />
              <View className="flex-1">
                <Text className="text-xs text-slate-500">Người đăng</Text>
                <Text className="text-base font-semibold text-ink">{room.ownerDisplayName}</Text>
              </View>
              <Button
                action="primary"
                variant="outline"
                size="sm"
                onPress={() => openProfile(room.ownerUserId)}
              >
                <ButtonText>Xem hồ sơ</ButtonText>
              </Button>
            </Card>
          ) : null}

          <View className="gap-2">
            {isOwner ? (
              <Button
                action="primary"
                className="h-12"
                onPress={() =>
                  router.push({ pathname: "/rooms/edit/[id]", params: { id: room.id } })
                }
              >
                <ButtonIcon as={Pencil} />
                <ButtonText>Chỉnh sửa phòng</ButtonText>
              </Button>
            ) : null}
            <Button
              action="primary"
              variant="outline"
              className="h-12"
              onPress={() =>
                void Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(position)}`,
                )
              }
            >
              <ButtonIcon as={MapPin} />
              <ButtonText>Mở Google Maps</ButtonText>
            </Button>
          </View>
        </View>
      ) : null}
    </FormScreen>
  );
}
