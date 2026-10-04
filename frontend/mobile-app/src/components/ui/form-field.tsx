import type { ReactNode } from "react";
import { Text, View } from "react-native";

export function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-ink">
        {label}
        {required ? <Text className="text-red-600"> *</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text accessibilityRole="alert" className="text-sm text-red-600">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" className="rounded-xl bg-red-50 px-4 py-3">
      <Text className="text-sm text-red-700">{message}</Text>
    </View>
  );
}
