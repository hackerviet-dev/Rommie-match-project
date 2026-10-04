import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { House, Mail } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, Pressable, Text, View } from "react-native";
import type { z } from "zod";
import { FormScreen } from "@/components/form-screen";
import { QueryState } from "@/components/query-state";
import { goBack, StackHeader } from "@/components/stack-header";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { useAuthStore } from "@/features/auth";
import { openProfile } from "@/features/matching/components/match-card";
import { openRoom } from "@/features/rooms/components/room-card";
import { colors } from "@/theme/colors";
import { inviteSchema } from "../schemas/workspace-schemas";
import { workspaceApi } from "../services/workspace-api";
import { groupRoleLabel } from "../utils/workspace-labels";

type MemberAction = { userId: string; name: string; role: string | null };
const ROLE_OPTIONS = [
  { label: "Thành viên", value: "member" },
  { label: "Người quản lý", value: "manager" },
  { label: "Chuyển chủ nhóm", value: "owner" },
] as const;

export function GroupScreen({ id }: { id: string }) {
  const me = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const [action, setAction] = useState<MemberAction | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ["groups", "detail", false, me, id],
    queryFn: () => workspaceApi.group(id, false),
    enabled: Boolean(id),
  });
  const invite = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  });
  const refresh = () => void client.invalidateQueries({ queryKey: ["groups"] });
  const inviting = useMutation({
    mutationFn: (values: z.infer<typeof inviteSchema>) => workspaceApi.invite(id, values.email),
    onSuccess: () => {
      refresh();
      invite.reset();
      setNotice("Đã gửi lời mời trong ứng dụng.");
    },
  });
  const change = useMutation({
    mutationFn: (target: MemberAction) =>
      target.role
        ? workspaceApi.role(id, target.userId, target.role, false)
        : workspaceApi.remove(id, target.userId),
    onSuccess: () => {
      refresh();
      setAction(null);
      setNotice("Đã cập nhật thành viên nhóm.");
    },
  });
  const leave = useMutation({
    mutationFn: () => workspaceApi.leave(id),
    onSuccess: () => {
      refresh();
      setLeaving(false);
      goBack();
    },
  });
  const group = detail.isError ? undefined : detail.data;
  const myRole = group?.members.find((m) => m.userId === me && m.status === "active")?.role;
  const isOwner = myRole === "owner";
  const canInvite = myRole === "owner" || myRole === "manager";

  return (
    <FormScreen>
      <StackHeader title={group?.name ?? "Nhóm ở ghép"} />
      <QueryState query={detail} />
      {group ? (
        <View className="mt-4 gap-4">
          <Card className="gap-2">
            <Text className="text-2xl font-bold text-ink">{group.name}</Text>
            {myRole ? (
              <Text className="text-sm text-slate-500">
                Vai trò của bạn: {groupRoleLabel(myRole)}
              </Text>
            ) : null}
            {group.roomId ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => group.roomId && openRoom(group.roomId)}
                className="flex-row items-center gap-1.5"
              >
                <House color={colors.teal} size={14} />
                <Text className="text-sm font-semibold text-teal">Xem phòng liên quan</Text>
              </Pressable>
            ) : null}
            {myRole && !isOwner ? (
              <Button
                action="muted"
                variant="outline"
                size="sm"
                className="mt-1 self-start"
                onPress={() => setLeaving(true)}
              >
                <ButtonText>Rời nhóm</ButtonText>
              </Button>
            ) : null}
          </Card>

          {canInvite ? (
            <Card className="gap-3">
              <FormField
                label="Mời thành viên bằng email"
                error={invite.formState.errors.email?.message}
              >
                <Controller
                  control={invite.control}
                  name="email"
                  render={({ field }) => (
                    <Input
                      value={field.value}
                      onChangeText={field.onChange}
                      accessibilityLabel="Email thành viên được mời"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholder="Email tài khoản cần mời"
                    />
                  )}
                />
              </FormField>
              <Button
                action="primary"
                className="h-11"
                loading={inviting.isPending}
                onPress={invite.handleSubmit((values) => {
                  Keyboard.dismiss();
                  inviting.mutate(values);
                })}
              >
                <ButtonIcon as={Mail} />
                <ButtonText>Mời vào nhóm</ButtonText>
              </Button>
              <FormError message={inviting.error?.message} />
            </Card>
          ) : null}
          {notice ? <Text className="text-center text-sm text-teal">{notice}</Text> : null}

          <Card className="gap-1 p-0">
            {group.members.map((member, index) => (
              <View
                key={member.userId}
                className={`gap-3 p-4 ${index ? "border-t border-slate-100" : ""}`}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Xem hồ sơ ${member.displayName}`}
                  onPress={() => openProfile(member.userId)}
                  className="flex-row items-center gap-3"
                >
                  <UserAvatar size="sm" name={member.displayName} avatarUrl={member.avatarUrl} />
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-ink">{member.displayName}</Text>
                    <Text className="text-xs text-slate-500">
                      {groupRoleLabel(member.role)} ·{" "}
                      {member.status === "active" ? "Đã tham gia" : "Chờ chấp nhận lời mời"}
                    </Text>
                  </View>
                </Pressable>
                {isOwner && member.role !== "owner" && member.status === "active" ? (
                  <ChoiceChips
                    options={ROLE_OPTIONS}
                    value={member.role}
                    onChange={(role) =>
                      role !== member.role &&
                      setAction({ userId: member.userId, name: member.displayName, role })
                    }
                  />
                ) : null}
                <View className="flex-row flex-wrap gap-2">
                  {isOwner && member.role !== "owner" ? (
                    <Button
                      action="muted"
                      variant="outline"
                      size="sm"
                      onPress={() =>
                        setAction({ userId: member.userId, name: member.displayName, role: null })
                      }
                    >
                      <ButtonText>
                        {member.status === "invited" ? "Huỷ lời mời" : "Xoá khỏi nhóm"}
                      </ButtonText>
                    </Button>
                  ) : null}
                  {member.userId !== me && member.status === "active" ? (
                    <Button
                      action="primary"
                      variant="outline"
                      size="sm"
                      onPress={() =>
                        router.push({
                          pathname: "/disputes/new",
                          params: { respondent: member.userId, group: id },
                        })
                      }
                    >
                      <ButtonText>Yêu cầu hoà giải</ButtonText>
                    </Button>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
      <ConfirmDialog
        open={leaving}
        title="Rời nhóm ở ghép?"
        description="Bạn sẽ không còn xem được thông tin nhóm. Muốn tham gia lại, bạn cần nhận lời mời mới."
        confirmLabel="Rời nhóm"
        destructive
        loading={leave.isPending}
        onConfirm={() => leave.mutate()}
        onClose={() => setLeaving(false)}
      >
        <FormError message={leave.error?.message} />
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(action)}
        title="Cập nhật quyền trong nhóm"
        description={
          action
            ? `${action.name}: ${action.role ? groupRoleLabel(action.role) : "Xoá khỏi nhóm"}.${action.role === "owner" ? " Bạn sẽ trở thành người quản lý." : ""}`
            : ""
        }
        confirmLabel="Xác nhận"
        destructive={!action?.role}
        loading={change.isPending}
        onConfirm={() => action && change.mutate(action)}
        onClose={() => setAction(null)}
      >
        <FormError message={change.error?.message} />
      </ConfirmDialog>
    </FormScreen>
  );
}
