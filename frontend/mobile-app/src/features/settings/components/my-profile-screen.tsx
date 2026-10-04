import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Briefcase, Cake, MapPin, Pencil } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, Text, View } from "react-native";
import { FormScreen } from "@/components/form-screen";
import { QueryState } from "@/components/query-state";
import { StackHeader } from "@/components/stack-header";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { DateField } from "@/components/ui/date-field";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { UserAvatar } from "@/components/user-avatar";
import { useAuthStore } from "@/features/auth";
import { lifestyleApi } from "@/features/lifestyle";
import { type Profile, profileApi } from "@/features/profile";
import { ApiError } from "@/services/api-error";
import { colors } from "@/theme/colors";
import { vietnamToday } from "@/utils/date-rules";
import {
  type SettingsProfileValues,
  settingsProfileSchema,
} from "../schemas/settings-profile-schema";

const MISSING = "Chưa cập nhật";
const GENDER: Record<string, string> = { male: "Nam", female: "Nữ", other: "Khác" };

function ageOf(profile: Profile) {
  if (!profile.birthDate)
    return profile.birthYear ? new Date().getFullYear() - profile.birthYear : null;
  const birth = new Date(`${profile.birthDate}T00:00:00`);
  const today = new Date();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  return today.getFullYear() - birth.getFullYear() - (beforeBirthday ? 1 : 0);
}

// Phần "Hồ sơ của tôi" trong trang Cài đặt của web: tổng quan, lối sống, sửa thông tin.
export function MyProfileScreen() {
  const userId = useAuthStore((state) => state.user?.id);
  const [editing, setEditing] = useState(false);
  const profile = useQuery({
    queryKey: ["profile", "me", userId],
    queryFn: profileApi.getMine,
    enabled: Boolean(userId),
  });
  const lifestyle = useQuery({
    queryKey: ["lifestyle", "me", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      try {
        return await lifestyleApi.getMine();
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
  const p = profile.data;
  const life = lifestyle.data;
  const age = p ? ageOf(p) : null;

  return (
    <FormScreen>
      <StackHeader title="Hồ sơ của tôi" />
      <QueryState query={profile} loadingText="Đang tải hồ sơ…" />
      {p ? (
        <View className="mt-4 gap-4">
          <Card className="items-center gap-2 p-6">
            <UserAvatar
              size="lg"
              name={p.displayName}
              avatarUrl={p.avatarUrl}
              className="h-20 w-20 border-2 border-mint"
              textClassName="text-2xl"
            />
            <Text className="mt-1 text-center text-2xl font-bold text-ink">{p.displayName}</Text>
            <Text className="text-sm text-slate-500">
              {age === null ? MISSING : `${age} tuổi`} · {GENDER[p.gender ?? ""] ?? MISSING}
            </Text>
            {p.isVerified ? (
              <Badge action="success" size="sm">
                <BadgeText action="success">Đã xác minh</BadgeText>
              </Badge>
            ) : null}
            <Text className="text-center text-sm leading-5 text-slate-600">
              {p.bio || "Chưa có giới thiệu."}
            </Text>
            <View className="mt-2 w-full gap-1">
              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-500">Mức độ hoàn thiện hồ sơ</Text>
                <Text className="text-xs font-bold text-navy">{p.profileCompletion}%</Text>
              </View>
              <ProgressBar value={p.profileCompletion} />
            </View>
          </Card>

          {editing ? (
            <ProfileEditor profile={p} onDone={() => setEditing(false)} />
          ) : (
            <Card className="gap-3">
              {(
                [
                  [Briefcase, p.occupation || MISSING],
                  [MapPin, [p.district, p.city].filter(Boolean).join(", ") || MISSING],
                  [Cake, p.birthDate ? p.birthDate.split("-").reverse().join("/") : MISSING],
                ] as const
              ).map(([Icon, value]) => (
                <View key={String(value)} className="flex-row items-center gap-3">
                  <Icon color={colors.navy} size={16} />
                  <Text className="flex-1 text-sm text-ink">{value}</Text>
                </View>
              ))}
              <Button
                action="primary"
                variant="outline"
                className="mt-1 h-11"
                onPress={() => setEditing(true)}
              >
                <ButtonIcon as={Pencil} />
                <ButtonText>Chỉnh sửa thông tin cá nhân</ButtonText>
              </Button>
            </Card>
          )}

          <Card className="gap-3">
            <Text className="text-lg font-bold text-ink">Lối sống</Text>
            <QueryState query={lifestyle} />
            {life ? (
              <View className="flex-row flex-wrap gap-2">
                {[
                  `Giờ ngủ: ${life.sleepSchedule}`,
                  `Sạch sẽ: ${life.cleanliness}/5`,
                  `Hút thuốc: ${life.smoking ? "Có" : "Không"}`,
                  `Thú cưng: ${life.petFriendly ? "Có" : "Không"}`,
                  `Xã hội: ${life.socialStyle}`,
                  `Ngân sách: ${(life.budgetMin / 1e6).toLocaleString("vi-VN")}–${(life.budgetMax / 1e6).toLocaleString("vi-VN")} triệu`,
                ].map((item) => (
                  <Badge key={item} action="muted" size="sm">
                    <BadgeText action="muted">{item}</BadgeText>
                  </Badge>
                ))}
              </View>
            ) : lifestyle.isSuccess ? (
              <Text className="text-sm text-slate-500">Bạn chưa cập nhật thông tin lối sống.</Text>
            ) : null}
            <View className="flex-row gap-2">
              <Button
                action="primary"
                variant="outline"
                className="h-11 flex-1"
                onPress={() => router.push("/onboarding")}
              >
                <ButtonText>Cập nhật lối sống</ButtonText>
              </Button>
              <Button
                action="secondary"
                className="h-11 flex-1"
                onPress={() => router.push("/quiz")}
              >
                <ButtonText>Khảo sát</ButtonText>
              </Button>
            </View>
          </Card>
        </View>
      ) : null}
    </FormScreen>
  );
}

function ProfileEditor({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const client = useQueryClient();
  const form = useForm<SettingsProfileValues>({
    resolver: zodResolver(settingsProfileSchema),
    defaultValues: {
      displayName: profile.displayName,
      city: profile.city,
      birthDate: profile.birthDate ?? "",
      gender: (profile.gender ?? "") as SettingsProfileValues["gender"],
      occupation: profile.occupation ?? "",
      district: profile.district ?? "",
      bio: profile.bio ?? "",
    },
  });
  // PUT thay cả hồ sơ: gửi đủ các trường như web, kể cả avatarUrl hiện tại.
  const save = useMutation({
    mutationFn: (values: SettingsProfileValues) =>
      profileApi.updateMine({
        ...values,
        birthDate: values.birthDate || null,
        gender: values.gender || null,
        occupation: values.occupation || null,
        district: values.district || null,
        bio: values.bio || null,
        avatarUrl: profile.avatarUrl,
      }),
    onSuccess: (updated) => {
      client.setQueryData(["profile", "me", updated.userId], updated);
      useAuthStore.setState((state) => ({
        user: state.user
          ? {
              ...state.user,
              displayName: updated.displayName,
              city: updated.city,
              district: updated.district,
            }
          : null,
      }));
      void client.invalidateQueries({ queryKey: ["profile"] });
      onDone();
    },
  });
  const errors = form.formState.errors;
  const text = (
    name: "displayName" | "city" | "district" | "occupation",
    label: string,
    required = false,
  ) => (
    <FormField label={label} required={required} error={errors[name]?.message}>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <Input
            value={field.value}
            onChangeText={field.onChange}
            accessibilityLabel={label}
            invalid={Boolean(errors[name])}
          />
        )}
      />
    </FormField>
  );

  return (
    <Card className="gap-4">
      <Text className="text-lg font-bold text-ink">Chỉnh sửa thông tin cá nhân</Text>
      {text("displayName", "Tên hiển thị", true)}
      <FormField label="Ngày sinh" error={errors.birthDate?.message}>
        <Controller
          control={form.control}
          name="birthDate"
          render={({ field }) => (
            <DateField
              value={field.value}
              onChange={field.onChange}
              invalid={Boolean(errors.birthDate)}
            />
          )}
        />
      </FormField>
      <FormField label="Giới tính">
        <Controller
          control={form.control}
          name="gender"
          render={({ field }) => (
            <ChoiceChips
              options={[
                { label: "Chưa cập nhật", value: "" },
                { label: "Nam", value: "male" },
                { label: "Nữ", value: "female" },
                { label: "Khác", value: "other" },
              ]}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FormField>
      {text("city", "Thành phố", true)}
      {text("district", "Quận / huyện")}
      {text("occupation", "Nghề nghiệp")}
      <FormField label="Giới thiệu" error={errors.bio?.message}>
        <Controller
          control={form.control}
          name="bio"
          render={({ field }) => (
            <Input
              value={field.value}
              onChangeText={field.onChange}
              accessibilityLabel="Giới thiệu"
              multiline
              maxLength={2000}
              textAlignVertical="top"
              className="h-28 py-3"
            />
          )}
        />
      </FormField>
      <Text className="-mt-2 text-xs text-slate-500">
        Ngày sinh không được ở tương lai (hôm nay: {vietnamToday().split("-").reverse().join("/")}).
      </Text>
      <FormError message={save.error?.message} />
      <View className="flex-row gap-2">
        <Button action="muted" variant="outline" className="h-12 flex-1" onPress={onDone}>
          <ButtonText>Huỷ</ButtonText>
        </Button>
        <Button
          action="primary"
          className="h-12 flex-1"
          loading={save.isPending}
          onPress={form.handleSubmit((values) => {
            Keyboard.dismiss();
            save.mutate(values);
          })}
        >
          <ButtonText>{save.isPending ? "Đang lưu…" : "Lưu thay đổi"}</ButtonText>
        </Button>
      </View>
    </Card>
  );
}
