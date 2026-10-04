import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, Text, View } from "react-native";
import { BrandHeader } from "@/components/brand-header";
import { FormScreen } from "@/components/form-screen";
import { Button, ButtonText } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PendingHint } from "@/components/ui/pending-hint";
import { authApi, loginSchema, useAuthStore } from "@/features/auth";
import { API_BASE_URL } from "@/services/api-client";

export default function LoginScreen() {
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const login = useAuthStore((state) => state.login);
  const queryClient = useQueryClient();
  const health = useQuery({ queryKey: ["auth", "health"], queryFn: authApi.health, retry: false });
  // Sau khi login(), guard ở src/app/_layout.tsx tự chuyển sang các tab.
  const signIn = useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => {
      queryClient.clear();
      login(session);
    },
  });
  const errors = form.formState.errors;
  const submit = form.handleSubmit((values) => {
    Keyboard.dismiss();
    if (!signIn.isPending) signIn.mutate(values);
  });

  return (
    <FormScreen>
      <BrandHeader />
      <Text className="mt-10 text-3xl font-bold text-ink">Chào mừng trở lại 👋</Text>
      <Text className="mt-2 text-sm text-slate-500">Đăng nhập để tìm bạn cùng phòng lý tưởng.</Text>

      {health.isError ? (
        <View className="mt-4">
          <FormError message={`Không kết nối được máy chủ (${API_BASE_URL}).`} />
        </View>
      ) : null}

      <View className="mt-8 gap-4">
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
                returnKeyType="next"
                onSubmitEditing={() => form.setFocus("password")}
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
                ref={field.ref}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(errors.password)}
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                placeholder="••••••••"
                returnKeyType="go"
                onSubmitEditing={submit}
              />
            )}
          />
        </FormField>
        <FormError message={signIn.error?.message} />
        <Button
          action="primary"
          className="mt-2 h-12 rounded-xl"
          loading={signIn.isPending}
          onPress={submit}
        >
          <ButtonText>{signIn.isPending ? "Đang đăng nhập…" : "Đăng nhập"}</ButtonText>
        </Button>
        <PendingHint active={signIn.isPending} />
      </View>

      <View className="mt-8 flex-row justify-center">
        <Text className="text-sm text-slate-500">Chưa có tài khoản? </Text>
        <Link href="/register" replace>
          <Text className="text-sm font-semibold text-teal">Đăng ký ngay</Text>
        </Link>
      </View>
    </FormScreen>
  );
}
