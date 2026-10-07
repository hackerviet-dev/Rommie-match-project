import { apiClient } from "@/services/api-client";
import type { ImagePurpose, UploadedImage } from "../types/media-types";

// Matches MediaRules on the backend; checked here first so a wrong file fails without a round trip.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateImageFile(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return "Chỉ nhận ảnh JPG, PNG hoặc WebP.";
  if (file.size > MAX_IMAGE_BYTES) return "Ảnh tối đa 5 MB.";
  return null;
}

export const mediaApi = {
  uploadImage: (file: File, purpose: ImagePurpose) => {
    const body = new FormData();
    body.append("file", file);
    body.append("purpose", purpose);
    return apiClient<UploadedImage>("/api/media/images", { method: "POST", body, authenticated: true });
  },
};

// Cloudinary resizes and picks the best format on delivery when the transformation is placed
// right after "/upload/". Other URLs (e.g. generated default avatars) are returned unchanged.
export function cloudinaryImage(url: string, { width, height }: { width: number; height?: number }) {
  const marker = "/image/upload/";
  if (!url.startsWith("https://res.cloudinary.com/") || !url.includes(marker)) return url;
  const size = height ? `c_fill,g_auto,w_${width},h_${height}` : `c_limit,w_${width}`;
  return url.replace(marker, `${marker}${size},f_auto,q_auto/`);
}
