import React, { createContext, useContext } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  Text,
  type TextProps,
  View,
  type ViewProps,
} from "react-native";
import { cn } from "../../lib/cn";

type ButtonVariant = "solid" | "outline" | "link" | "ghost";
type ButtonAction = "primary" | "secondary" | "positive" | "negative" | "muted";
type ButtonSize = "sm" | "md" | "lg" | "xl";

const ButtonContext = createContext<{
  action: ButtonAction;
  size: ButtonSize;
  variant: ButtonVariant;
}>({
  action: "primary",
  size: "md",
  variant: "solid",
});

const solidByAction: Record<ButtonAction, string> = {
  primary: "bg-ink",
  secondary: "bg-violet",
  positive: "bg-mint",
  negative: "bg-coral",
  muted: "bg-slate-200",
};

const outlineByAction: Record<ButtonAction, string> = {
  primary: "border-ink",
  secondary: "border-violet",
  positive: "border-mint",
  negative: "border-coral",
  muted: "border-slate-300",
};

const textByAction: Record<ButtonAction, string> = {
  primary: "text-ink",
  secondary: "text-violet",
  positive: "text-mint",
  negative: "text-coral",
  muted: "text-slate-600",
};

const sizeByName: Record<ButtonSize, string> = {
  sm: "h-9 px-3",
  md: "h-11 px-4",
  lg: "h-12 px-5",
  xl: "h-14 px-6",
};

type ButtonProps = PressableProps & {
  action?: ButtonAction;
  className?: string;
  isDisabled?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function Button({
  action = "primary",
  className,
  disabled,
  isDisabled,
  size = "md",
  variant = "solid",
  ...props
}: ButtonProps) {
  const inactive = disabled || isDisabled;
  const variantClass =
    variant === "solid"
      ? solidByAction[action]
      : variant === "outline"
        ? cn("border bg-white", outlineByAction[action])
        : "bg-transparent";

  return (
    <ButtonContext.Provider value={{ action, size, variant }}>
      <Pressable
        accessibilityRole="button"
        disabled={inactive}
        className={cn(
          "flex-row items-center justify-center gap-2 rounded-xl",
          sizeByName[size],
          variantClass,
          inactive && "opacity-50",
          className,
        )}
        {...props}
      />
    </ButtonContext.Provider>
  );
}

type ButtonTextProps = TextProps & {
  className?: string;
};

export function ButtonText({ className, ...props }: ButtonTextProps) {
  const { action, size, variant } = useContext(ButtonContext);
  const textSize = size === "sm" ? "text-sm" : size === "xl" ? "text-lg" : "text-base";
  const color = variant === "solid" && action !== "muted" ? "text-white" : textByAction[action];

  return <Text className={cn("font-semibold", textSize, color, className)} {...props} />;
}

export function ButtonSpinner() {
  const { action, variant } = useContext(ButtonContext);
  const color = variant === "solid" && action !== "muted" ? "#ffffff" : "#171717";
  return <ActivityIndicator color={color} />;
}

type ButtonIconProps = ViewProps & {
  as?: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  className?: string;
};

export function ButtonIcon({ as: Icon, className, ...props }: ButtonIconProps) {
  const { action, size, variant } = useContext(ButtonContext);
  const color = variant === "solid" && action !== "muted" ? "#ffffff" : "#171717";
  const iconSize = size === "sm" ? 16 : size === "xl" ? 22 : 18;

  return (
    <View className={cn("items-center justify-center", className)} {...props}>
      {Icon ? <Icon color={color} size={iconSize} strokeWidth={2.3} /> : null}
    </View>
  );
}

type ButtonGroupProps = ViewProps & {
  className?: string;
  space?: "sm" | "md" | "lg";
};

export function ButtonGroup({ className, space = "md", ...props }: ButtonGroupProps) {
  const gap = space === "sm" ? "gap-2" : space === "lg" ? "gap-4" : "gap-3";
  return <View className={cn("flex-row", gap, className)} {...props} />;
}
