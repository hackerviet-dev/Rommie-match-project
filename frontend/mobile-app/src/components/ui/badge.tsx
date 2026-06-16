import React from "react";
import { Text, type TextProps, View, type ViewProps } from "react-native";
import { cn } from "../../lib/cn";

type BadgeAction = "error" | "warning" | "success" | "info" | "muted";
type BadgeVariant = "solid" | "outline";
type BadgeSize = "sm" | "md" | "lg";

const solidByAction: Record<BadgeAction, string> = {
  error: "bg-red-100",
  warning: "bg-amber-100",
  success: "bg-emerald-100",
  info: "bg-sky-100",
  muted: "bg-slate-100",
};

const textByAction: Record<BadgeAction, string> = {
  error: "text-red-700",
  warning: "text-amber-700",
  success: "text-emerald-700",
  info: "text-sky-700",
  muted: "text-slate-600",
};

type BadgeProps = ViewProps & {
  action?: BadgeAction;
  className?: string;
  size?: BadgeSize;
  variant?: BadgeVariant;
};

export function Badge({
  action = "success",
  className,
  size = "md",
  variant = "solid",
  ...props
}: BadgeProps) {
  const sizeClass = size === "sm" ? "px-2 py-1" : size === "lg" ? "px-3 py-1.5" : "px-2.5 py-1";

  return (
    <View
      className={cn(
        "self-start rounded-full",
        sizeClass,
        variant === "solid" ? solidByAction[action] : "border border-slate-200 bg-white",
        className,
      )}
      {...props}
    />
  );
}

type BadgeTextProps = TextProps & {
  action?: BadgeAction;
  className?: string;
};

export function BadgeText({ action = "success", className, ...props }: BadgeTextProps) {
  return (
    <Text className={cn("text-xs font-semibold", textByAction[action], className)} {...props} />
  );
}
