import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, ButtonText } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { DateField } from "@/components/ui/date-field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { colors } from "@/theme/colors";
import type { MatchFilters } from "../types/matching-types";

export type ListFilters = Omit<MatchFilters, "page" | "pageSize" | "q">;

const SCORE_OPTIONS = [
  { label: "Tất cả", value: "" },
  { label: "≥ 70%", value: "70" },
  { label: "≥ 80%", value: "80" },
  { label: "≥ 90%", value: "90" },
] as const;
const ENVIRONMENT_OPTIONS = [
  { label: "Mọi không gian", value: "" },
  { label: "Yên tĩnh", value: "quiet" },
  { label: "Vừa phải", value: "moderate" },
  { label: "Sôi nổi", value: "lively" },
] as const;
const TOGGLES = [
  ["sameCity", "Cùng thành phố"],
  ["petFriendly", "Yêu thú cưng"],
  ["nonSmoking", "Không hút thuốc"],
  ["verifiedOnly", "Chỉ hồ sơ đã xác minh"],
] as const;

const toNumber = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : undefined;
};

export function countActiveFilters(filters: ListFilters) {
  return Object.values(filters).filter(
    (value) => value !== undefined && value !== "" && value !== false,
  ).length;
}

// Bộ lọc giống trang Ở ghép của web. Các lọc Premium (khu vực, ngân sách, sạch sẽ, không
// gian, đã xác minh) do backend quyết định có áp dụng hay không theo gói của người dùng.
export function MatchFiltersSheet({
  open,
  value,
  onApply,
  onClose,
}: {
  open: boolean;
  value: ListFilters;
  onApply: (filters: ListFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ListFilters>(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);
  const set = <K extends keyof ListFilters>(key: K, next: ListFilters[K]) =>
    setDraft((current) => ({ ...current, [key]: next }));

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-paper">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-lg font-bold text-ink">Bộ lọc</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng bộ lọc"
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
          >
            <X color={colors.navy} size={20} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <FormField label="Điểm phù hợp tối thiểu">
            <ChoiceChips
              options={SCORE_OPTIONS}
              value={draft.minScore ? String(draft.minScore) : ""}
              onChange={(next) => set("minScore", next ? Number(next) : undefined)}
            />
          </FormField>
          <FormField label="Thành phố ứng viên">
            <Input
              value={draft.city ?? ""}
              onChangeText={(next) => set("city", next || undefined)}
              maxLength={100}
              placeholder="VD: TP.HCM (để trống nếu không lọc)"
            />
          </FormField>
          <View className="gap-1">
            {TOGGLES.map(([key, label]) => (
              <View key={key} className="flex-row items-center justify-between py-1.5">
                <Text className="text-base text-ink">{label}</Text>
                <Switch
                  accessibilityLabel={label}
                  value={Boolean(draft[key])}
                  onValueChange={(next) => set(key, next || undefined)}
                  trackColor={{ true: colors.teal, false: "#cbd5e1" }}
                />
              </View>
            ))}
          </View>
          <FormField label="Dọn vào trước ngày">
            <DateField
              value={draft.moveInBy ?? ""}
              onChange={(next) => set("moveInBy", next || undefined)}
            />
          </FormField>

          <View className="gap-4 rounded-2xl border border-teal/20 bg-mint/10 p-4">
            <Text className="text-sm font-bold text-navy">Bộ lọc Premium</Text>
            <FormField label="Quận / khu vực">
              <Input
                value={draft.district ?? ""}
                onChangeText={(next) => set("district", next || undefined)}
                placeholder="VD: Quận 3"
              />
            </FormField>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField label="Ngân sách từ (VND)">
                  <Input
                    value={draft.budgetMin ? String(draft.budgetMin) : ""}
                    onChangeText={(next) => set("budgetMin", toNumber(next))}
                    keyboardType="number-pad"
                    placeholder="3000000"
                  />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="Đến (VND)">
                  <Input
                    value={draft.budgetMax ? String(draft.budgetMax) : ""}
                    onChangeText={(next) => set("budgetMax", toNumber(next))}
                    keyboardType="number-pad"
                    placeholder="7000000"
                  />
                </FormField>
              </View>
            </View>
            <FormField label="Sạch sẽ tối thiểu (1–5)">
              <ChoiceChips
                options={[
                  { label: "Bất kỳ", value: "" },
                  ...["1", "2", "3", "4", "5"].map((level) => ({ label: level, value: level })),
                ]}
                value={draft.minCleanliness ? String(draft.minCleanliness) : ""}
                onChange={(next) => set("minCleanliness", next ? Number(next) : undefined)}
              />
            </FormField>
            <FormField label="Không gian phòng">
              <ChoiceChips
                options={ENVIRONMENT_OPTIONS}
                value={draft.roomEnvironment ?? ""}
                onChange={(next) => set("roomEnvironment", next || undefined)}
              />
            </FormField>
          </View>
        </ScrollView>
        <View className="flex-row gap-3 border-t border-slate-100 bg-white p-4">
          <Button
            action="muted"
            variant="outline"
            className="h-12 flex-1"
            onPress={() => setDraft({})}
          >
            <ButtonText>Xoá bộ lọc</ButtonText>
          </Button>
          <Button
            action="primary"
            className="h-12 flex-1"
            onPress={() => {
              onApply(draft);
              onClose();
            }}
          >
            <ButtonText>Áp dụng</ButtonText>
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
