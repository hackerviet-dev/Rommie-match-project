import React from "react";
import { Image, type ImageProps, Text, View, type ViewProps } from "react-native";
import { cn } from "../../lib/cn";

type AvatarProps = ViewProps & {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function Avatar({ className, size = "md", ...props }: AvatarProps) {
  const sizeClass = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-16 w-16" : "h-12 w-12";
  return (
    <View
      className={cn(
        "items-center justify-center overflow-hidden rounded-full bg-slate-200",
        sizeClass,
        className,
      )}
      {...props}
    />
  );
}

export function AvatarImage(props: ImageProps) {
  return <Image className="h-full w-full" resizeMode="cover" {...props} />;
}

type AvatarFallbackProps = {
  children: React.ReactNode;
  className?: string;
};

export function AvatarFallback({ children, className }: AvatarFallbackProps) {
  return <Text className={cn("text-base font-bold text-ink", className)}>{children}</Text>;
}
