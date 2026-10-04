import { useState } from "react";
import { Image } from "react-native";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/features/auth";
import { cn } from "@/lib/cn";

// Image của React Native không vẽ được SVG, trong khi avatar mặc định của backend là
// DiceBear dạng SVG; DiceBear trả PNG cho cùng seed nếu đổi định dạng trên URL.
export function toNativeImageUri(url: string) {
  return url.replace(/^(https:\/\/api\.dicebear\.com\/[^/]+\/[^/]+)\/svg(?=\?|$)/, "$1/png");
}

// Chữ viết tắt luôn nằm dưới ảnh, nên khi ảnh chưa tải xong hoặc lỗi vẫn thấy được.
export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
  textClassName,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  textClassName?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl) && failedUrl !== avatarUrl;
  return (
    <Avatar size={size} className={cn("bg-mint/30", className)}>
      <AvatarFallback className={cn("text-navy", textClassName)}>
        {getInitials(name)}
      </AvatarFallback>
      {showImage && avatarUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: toNativeImageUri(avatarUrl) }}
          onError={() => setFailedUrl(avatarUrl)}
          resizeMode="cover"
          className="absolute inset-0 h-full w-full"
        />
      ) : null}
    </Avatar>
  );
}
