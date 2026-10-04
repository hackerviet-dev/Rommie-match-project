import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, Text, View } from "react-native";
import type { z } from "zod";
import { FormScreen } from "@/components/form-screen";
import { StackHeader } from "@/components/stack-header";
import { Button, ButtonText } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectSheet } from "@/components/ui/select-sheet";
import { useAuthStore } from "@/features/auth";
import { chatApi } from "@/features/chat";
import { profileApi } from "@/features/profile";
import { disputeSchema } from "../schemas/workspace-schemas";
import { workspaceApi } from "../services/workspace-api";

type DisputeForm = z.infer<typeof disputeSchema>;

// Người liên quan được chọn trong số người đã nhắn tin, thành viên nhóm đã chọn, hoặc người
// được truyền sẵn (mở từ hồ sơ / nhóm) — giống DisputesPanel của web.
export function NewDisputeScreen({ respondent, group }: { respondent?: string; group?: string }) {
  const me = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const form = useForm<DisputeForm>({
    resolver: zodResolver(disputeSchema),
    defaultValues: {
      respondentId: respondent ?? "",
      groupId: group ?? "",
      roomId: "",
      title: "",
      details: "",
    },
  });
  const groupId = form.watch("groupId");
  const groups = useQuery({
    queryKey: ["groups", "dispute-options", me],
    queryFn: () => workspaceApi.groups(false),
  });
  const groupDetail = useQuery({
    queryKey: ["groups", "dispute-group", me, groupId],
    queryFn: () => workspaceApi.group(groupId ?? "", false),
    enabled: Boolean(groupId),
  });
  const partners = useQuery({
    queryKey: ["chat", "dispute-options", me],
    queryFn: () => chatApi.list(),
  });
  const target = useQuery({
    queryKey: ["profile", "dispute-target", me, respondent],
    queryFn: () => profileApi.getByUserId(respondent ?? ""),
    enabled: Boolean(respondent),
  });
  const candidates = [
    ...new Map(
      [
        ...(!groupId
          ? (partners.data?.items.map((c) => ({
              value: c.partner.userId,
              label: c.partner.displayName,
            })) ?? [])
          : []),
        ...(groupDetail.data?.members
          .filter((m) => m.status === "active" && m.userId !== me)
          .map((m) => ({ value: m.userId, label: m.displayName })) ?? []),
        ...(respondent && target.data
          ? [{ value: respondent, label: target.data.displayName }]
          : []),
      ].map((c) => [c.value, c]),
    ).values(),
  ];
  const create = useMutation({
    mutationFn: (values: DisputeForm) =>
      workspaceApi.createDispute({
        ...values,
        roomId: values.roomId || undefined,
        groupId: values.groupId || undefined,
      }),
    onSuccess: (dispute) => {
      void client.invalidateQueries({ queryKey: ["disputes"] });
      router.replace({ pathname: "/disputes/[id]", params: { id: dispute.id } });
    },
  });
  const errors = form.formState.errors;

  return (
    <FormScreen>
      <StackHeader title="Yêu cầu hoà giải mới" />
      <View className="mt-4 gap-4">
        <FormField label="Nhóm liên quan (tuỳ chọn)">
          <Controller
            control={form.control}
            name="groupId"
            render={({ field }) => (
              <SelectSheet
                title="Nhóm liên quan"
                placeholder="Không chọn nhóm"
                searchable={false}
                options={[
                  { label: "Không chọn nhóm", value: "" },
                  ...(groups.data?.items
                    .filter((g) => g.myStatus === "active")
                    .map((g) => ({ label: g.name, value: g.id })) ?? []),
                ]}
                value={field.value ?? ""}
                onChange={(value) => {
                  field.onChange(value);
                  if (value !== field.value) form.setValue("respondentId", respondent ?? "");
                }}
              />
            )}
          />
        </FormField>
        <FormField label="Bên liên quan" required error={errors.respondentId?.message}>
          <Controller
            control={form.control}
            name="respondentId"
            render={({ field }) => (
              <SelectSheet
                title="Bên liên quan"
                placeholder="Chọn người đã kết nối / trong nhóm"
                options={candidates}
                value={field.value}
                invalid={Boolean(errors.respondentId)}
                onChange={field.onChange}
              />
            )}
          />
          {candidates.length === 0 && partners.isSuccess ? (
            <Text className="text-xs text-slate-500">
              Chưa có ai để chọn: hãy nhắn tin với người đó hoặc chọn một nhóm trước.
            </Text>
          ) : null}
        </FormField>
        <FormField label="Tiêu đề" required error={errors.title?.message}>
          <Controller
            control={form.control}
            name="title"
            render={({ field }) => (
              <Input
                value={field.value}
                onChangeText={field.onChange}
                accessibilityLabel="Tiêu đề"
                invalid={Boolean(errors.title)}
                maxLength={180}
                placeholder="VD: Chưa thống nhất việc hoàn tiền cọc"
              />
            )}
          />
        </FormField>
        <FormField label="Mô tả sự việc và bằng chứng" required error={errors.details?.message}>
          <Controller
            control={form.control}
            name="details"
            render={({ field }) => (
              <Input
                value={field.value}
                onChangeText={field.onChange}
                accessibilityLabel="Mô tả sự việc"
                invalid={Boolean(errors.details)}
                multiline
                maxLength={5000}
                textAlignVertical="top"
                className="h-40 py-3"
                placeholder="Ghi rõ thời điểm, khoản tiền, thoả thuận và liên kết bằng chứng…"
              />
            )}
          />
        </FormField>
        <FormError message={create.error?.message} />
        <Button
          action="primary"
          className="h-12"
          loading={create.isPending}
          onPress={form.handleSubmit((values) => {
            Keyboard.dismiss();
            create.mutate(values);
          })}
        >
          <ButtonText>Gửi yêu cầu hoà giải</ButtonText>
        </Button>
      </View>
    </FormScreen>
  );
}
