import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Keyboard, Text, View } from "react-native";
import { FormScreen } from "@/components/form-screen";
import { QueryState } from "@/components/query-state";
import { StackHeader } from "@/components/stack-header";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth";
import { messageSchema } from "../schemas/workspace-schemas";
import { workspaceApi } from "../services/workspace-api";
import { disputeStatusLabel } from "../utils/workspace-labels";
import { disputeStatusAction } from "./disputes-screen";

export function DisputeScreen({ id }: { id: string }) {
  const me = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ["disputes", "detail", false, me, id],
    queryFn: () => workspaceApi.dispute(id, false),
    enabled: Boolean(id),
  });
  const send = useMutation({
    mutationFn: (text: string) => workspaceApi.message(id, false, text),
    onSuccess: () => {
      setContent("");
      void client.invalidateQueries({ queryKey: ["disputes"] });
    },
  });
  const dispute = detail.isError ? undefined : detail.data;
  const closed = dispute ? ["resolved", "dismissed"].includes(dispute.status) : false;
  function submit() {
    const result = messageSchema.safeParse({ content });
    if (!result.success) return setError(result.error.issues[0].message);
    setError(null);
    Keyboard.dismiss();
    send.mutate(result.data.content);
  }

  return (
    <FormScreen>
      <StackHeader title="Hồ sơ hoà giải" />
      <QueryState query={detail} />
      {dispute ? (
        <View className="mt-4 gap-4">
          <Card className="gap-2">
            <View className="flex-row">
              <Badge action={disputeStatusAction(dispute.status)} size="sm">
                <BadgeText action={disputeStatusAction(dispute.status)}>
                  {disputeStatusLabel(dispute.status)}
                </BadgeText>
              </Badge>
            </View>
            <Text className="text-xl font-bold text-ink">{dispute.title}</Text>
            <Text className="text-sm text-slate-500">
              {dispute.complainantName} ↔ {dispute.respondentName}
            </Text>
            <Text className="mt-1 text-sm leading-6 text-ink">{dispute.details}</Text>
          </Card>

          {dispute.resolutionNote ? (
            <Card className="gap-1 border-teal/30 bg-mint/10">
              <Text className="text-sm font-bold text-navy">Ghi nhận xử lý</Text>
              <Text className="text-sm leading-5 text-ink">{dispute.resolutionNote}</Text>
            </Card>
          ) : null}

          <Text className="text-base font-bold text-ink">Diễn biến</Text>
          {dispute.messages?.length ? (
            dispute.messages.map((message) => (
              <Card key={message.id} className="gap-1">
                <Text className="text-xs text-slate-500">
                  {message.authorName ?? "Tài khoản đã xoá"} ·{" "}
                  {new Date(message.createdAt).toLocaleString("vi-VN")}
                </Text>
                <Text className="text-sm leading-5 text-ink">{message.content}</Text>
              </Card>
            ))
          ) : (
            <Text className="text-sm text-slate-500">Chưa có phản hồi.</Text>
          )}

          {!closed ? (
            <Card className="gap-3">
              <Input
                value={content}
                onChangeText={setContent}
                accessibilityLabel="Phản hồi tranh chấp"
                invalid={Boolean(error)}
                multiline
                maxLength={4000}
                textAlignVertical="top"
                className="h-28 py-3"
                placeholder="Bổ sung thông tin hoặc phản hồi bên liên quan"
              />
              <FormError message={error ?? send.error?.message} />
              <Button action="primary" className="h-11" loading={send.isPending} onPress={submit}>
                <ButtonText>Gửi phản hồi</ButtonText>
              </Button>
            </Card>
          ) : (
            <Text className="text-center text-sm text-slate-500">Hồ sơ đã đóng.</Text>
          )}
        </View>
      ) : null}
    </FormScreen>
  );
}
