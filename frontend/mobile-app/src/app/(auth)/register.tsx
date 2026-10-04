import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { BrandHeader } from "@/components/brand-header";
import { FormScreen } from "@/components/form-screen";
import { Button, ButtonText } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectSheet } from "@/components/ui/select-sheet";
import { VN_LOCATIONS } from "@/constants/locations";
import { authApi, registerSchema, useAuthStore } from "@/features/auth";

const GENDER_OPTIONS = [
  { label: "Nam", value: "male" },
  { label: "Nữ", value: "female" },
  { label: "Khác", value: "other" },
  { label: "Không muốn tiết lộ", value: "undisclosed" },
] as const;
type GenderChoice = (typeof GENDER_OPTIONS)[number]["value"];

export default function RegisterScreen() {
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", displayName: "", city: "" },
  });
  const [gender, setGender] = useState<GenderChoice | null>(null);
  const login = useAuthStore((state) => state.login);
  const queryClient = useQueryClient();
  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: (session) => {
      queryClient.clear();
      login(session);
    },
  });
  const errors = form.formState.errors;
  const city = form.watch("city");
  const canSubmit = Boolean(gender && city);

  const submit = form.handleSubmit((values) => {
    if (!canSubmit || register.isPending) return;
    register.mutate({ ...values, gender: gender === "undisclosed" ? null : gender });
  });

  return (
    <FormScreen>
      <BrandHeader />
      <Text className="mt-10 text-3xl font-bold text-ink">Tạo tài khoản</Text>
      <Text className="mt-2 text-sm text-slate-500">
        Bắt đầu hành trình tìm bạn cùng phòng lý tưởng.
      </Text>

      <View className="mt-8 gap-4">
        <FormField label="Họ và tên" error={errors.displayName?.message}>
          <Controller
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(errors.displayName)}
                autoComplete="name"
                textContentType="name"
                maxLength={120}
                placeholder="Nguyễn Văn A"
              />
            )}
          />
        </FormField>
        <FormField label="Email" error={errors.email?.message}>
          <Controller
            control={form.control}
            name="email"
            render={({ field }) => (
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(errors.email)}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="ban@truonghoc.edu.vn"
              />
            )}
          />
        </FormField>
        <FormField label="Mật khẩu" error={errors.password?.message}>
          <Controller
            control={form.control}
            name="password"
            render={({ field }) => (
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(errors.password)}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                maxLength={200}
                placeholder="Ít nhất 8 ký tự"
              />
            )}
          />
        </FormField>
        <FormField label="Giới tính của bạn" required>
          <ChoiceChips options={GENDER_OPTIONS} value={gender} onChange={setGender} />
        </FormField>
        <FormField label="Thành phố / Tỉnh hiện tại" required error={errors.city?.message}>
          <SelectSheet
            title="Thành phố / Tỉnh"
            placeholder="Chọn thành phố hoặc tỉnh"
            options={VN_LOCATIONS}
            value={city}
            invalid={Boolean(errors.city)}
            onChange={(value) => form.setValue("city", value, { shouldValidate: true })}
          />
        </FormField>

        <FormError message={register.error?.message} />
        <Button
          action="primary"
          className="mt-2 h-12 rounded-xl"
          disabled={!canSubmit || register.isPending}
          onPress={submit}
        >
          <ButtonText>{register.isPending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}</ButtonText>
        </Button>
        {!canSubmit ? (
          <Text className="text-center text-xs text-slate-500">
            Vui lòng chọn giới tính và thành phố để tiếp tục.
          </Text>
        ) : null}
        <Text className="text-center text-xs text-slate-500">
          Khi đăng ký, bạn đồng ý với Điều khoản và Chính sách bảo mật.
        </Text>
      </View>

      <View className="mt-6 flex-row justify-center">
        <Text className="text-sm text-slate-500">Đã có tài khoản? </Text>
        <Link href="/login" replace>
          <Text className="text-sm font-semibold text-teal">Đăng nhập</Text>
        </Link>
      </View>
    </FormScreen>
  );
}
