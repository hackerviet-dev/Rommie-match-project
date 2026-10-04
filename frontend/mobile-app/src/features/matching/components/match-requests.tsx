import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonText } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-field";
import { UserAvatar } from "@/components/user-avatar";
import { matchingApi } from "../services/matching-api";
import type { MatchRequest } from "../types/matching-types";
import { openProfile } from "./match-card";

const STATUS: Record<string, { label: string; action: "info" | "success" | "muted" | "error" }> = {
  pending: { label: "Đang chờ", action: "info" },
  accepted: { label: "Đã ghép", action: "success" },
  declined: { label: "Đã từ chối", action: "error" },
  cancelled: { label: "Đã huỷ", action: "muted" },
  ended: { label: "Đã kết thúc", action: "muted" },
};

type RequestAction = "accept" | "decline" | "cancel" | "end";

export function useRespondToRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: RequestAction }) =>
      matchingApi.respond(id, action),
    onSuccess: () => client.invalidateQueries({ queryKey: ["match-requests"] }),
  });
}

export function MatchRequestItem({
  request,
  respond,
}: {
  request: MatchRequest;
  respond: ReturnType<typeof useRespondToRequest>;
}) {
  const status = STATUS[request.status] ?? { label: request.status, action: "muted" as const };
  const busy = respond.isPending && respond.variables?.id === request.id;
  const act = (action: RequestAction) => respond.mutate({ id: request.id, action });
  return (
    <View className="gap-3 rounded-2xl border border-slate-100 bg-white p-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem hồ sơ ${request.partner.displayName}`}
        onPress={() => openProfile(request.partner.userId)}
        className="flex-row items-center gap-3"
      >
        <UserAvatar
          size="sm"
          name={request.partner.displayName}
          avatarUrl={request.partner.avatarUrl}
        />
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-ink" numberOfLines={1}>
            {request.partner.displayName}
          </Text>
          <Text className="text-xs text-slate-500">
            {request.direction === "incoming" ? "Đã gửi cho bạn" : "Bạn đã gửi"}
          </Text>
        </View>
        <Badge action={status.action} size="sm">
          <BadgeText action={status.action}>{status.label}</BadgeText>
        </Badge>
      </Pressable>
      {request.message ? <Text className="text-sm text-ink">{request.message}</Text> : null}
      {request.status === "pending" && !request.isBlocked ? (
        request.direction === "incoming" ? (
          <View className="flex-row gap-2">
            <Button
              action="secondary"
              size="sm"
              className="flex-1"
              loading={busy && respond.variables?.action === "accept"}
              disabled={busy}
              onPress={() => act("accept")}
            >
              <ButtonText>Chấp nhận</ButtonText>
            </Button>
            <Button
              action="muted"
              variant="outline"
              size="sm"
              className="flex-1"
              loading={busy && respond.variables?.action === "decline"}
              disabled={busy}
              onPress={() => act("decline")}
            >
              <ButtonText>Từ chối</ButtonText>
            </Button>
          </View>
        ) : (
          <Button
            action="muted"
            variant="outline"
            size="sm"
            loading={busy}
            onPress={() => act("cancel")}
          >
            <ButtonText>Huỷ đề nghị</ButtonText>
          </Button>
        )
      ) : null}
      {request.status === "accepted" ? (
        <Button
          action="muted"
          variant="outline"
          size="sm"
          loading={busy}
          onPress={() => act("end")}
        >
          <ButtonText>Kết thúc ở ghép</ButtonText>
        </Button>
      ) : null}
      {respond.isError && respond.variables?.id === request.id ? (
        <FormError message={respond.error.message} />
      ) : null}
    </View>
  );
}
