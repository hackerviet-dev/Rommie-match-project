export type ImagePurpose = "avatar" | "chat" | "verification";

export type UploadedImage = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: "jpg" | "png" | "webp" | string;
};
