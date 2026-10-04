import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Switch, Text, View } from "react-native";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { colors } from "@/theme/colors";
import { safetyApi } from "../services/safety-api";

const REASONS = [
  { value: "fake", label: "Giả mạo" },
  { value: "scam", label: "Lừa đảo" },
  { value: "harass", label: "Quấy rối" },
  { value: "sexual", label: "Nội dung tình dục" },
  { value: "spam", label: "Spam" },
  { value: "underage", label: "Chưa đủ tuổi" },
  { value: "other", label: "Khác" },
] as const;

export function ReportDialog({
  userId,
  open,
  onClose,
  onReported,
  onBlocked,
}: {
  userId: string;
  open: boolean;
  onClose: () => void;
  onReported: () => void;
  onBlocked: () => void;
}) {
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const report = useMutation({
    mutationFn: async () => {
      await safetyApi.report(userId, reason, details);
      if (!alsoBlock) return;
      try {
        await safetyApi.block(userId);
        onBlocked();
      } catch (error) {
        throw new Error(
          `Đã gửi báo cáo, nhưng chặn thất bại: ${error instanceof Error ? error.message : "Thử lại bằng nút Chặn."}`,
        );
      }
    },
    onSuccess: () => {
      onReported();
      onClose();
      void client.invalidateQueries({ queryKey: ["matching"] });
    },
  });
  const canSend = Boolean(reason) && (reason !== "other" || Boolean(details.trim()));

  return (
    <ConfirmDialog
      open={open}
      title="Báo cáo thành viên"
      description="Báo cáo sẽ được gửi cho bộ phận kiểm duyệt."
      confirmLabel="Gửi báo cáo"
      loading={report.isPending}
      confirmDisabled={!canSend}
      onClose={onClose}
      onConfirm={() => {
        if (canSend) report.mutate();
      }}
    >
      <FormField label="Lý do" required>
        <ChoiceChips options={REASONS} value={reason} onChange={setReason} />
      </FormField>
      <FormField
        label={`Chi tiết ${reason === "other" ? "" : "(tuỳ chọn)"}`}
        required={reason === "other"}
      >
        <Input
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={2000}
          textAlignVertical="top"
          className="h-24 py-3"
          placeholder="Mô tả ngắn điều bạn gặp phải"
        />
      </FormField>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-ink">Đồng thời chặn thành viên</Text>
        <Switch
          accessibilityLabel="Đồng thời chặn thành viên"
          value={alsoBlock}
          onValueChange={setAlsoBlock}
          trackColor={{ true: colors.teal, false: "#cbd5e1" }}
        />
      </View>
      {!canSend && reason === "other" ? (
        <Text className="text-xs text-slate-500">Vui lòng nhập chi tiết khi chọn "Khác".</Text>
      ) : null}
      <FormError message={report.error?.message} />
    </ConfirmDialog>
  );
}
