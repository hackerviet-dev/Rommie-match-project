import React from "react";
import { Text, type TextProps, View, type ViewProps } from "react-native";
import { cn } from "../../lib/cn";

type CardProps = ViewProps & {
  className?: string;
};

export function Card({ className, ...props }: CardProps) {
  return (
    <View
      className={cn("rounded-2xl border border-slate-200 bg-white p-4", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return <View className={cn("gap-1", className)} {...props} />;
}

export function CardContent({ className, ...props }: CardProps) {
  return <View className={cn("mt-4", className)} {...props} />;
}

type CardTextProps = TextProps & {
  className?: string;
};

export function CardTitle({ className, ...props }: CardTextProps) {
  return <Text className={cn("text-xl font-bold text-ink", className)} {...props} />;
}

export function CardDescription({ className, ...props }: CardTextProps) {
  return <Text className={cn("text-sm leading-5 text-slate-500", className)} {...props} />;
}
