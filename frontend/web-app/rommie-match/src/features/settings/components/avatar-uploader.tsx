import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/features/auth";
import { ACCEPTED_IMAGE_TYPES, cloudinaryImage, mediaApi, validateImageFile } from "@/features/media";
import { profileApi, type Profile } from "@/features/profile";

// Uploads the picked photo to Cloudinary through the API, then saves its URL on the profile
// right away; the rest of the profile is sent back unchanged because PUT replaces it whole.
export function AvatarUploader({ profile }: { profile: Profile }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const updateUser = useAuthStore(state => state.updateUser);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const image = await mediaApi.uploadImage(file, "avatar");
      return profileApi.updateMine({
        displayName: profile.displayName, birthDate: profile.birthDate, gender: profile.gender,
        occupation: profile.occupation, bio: profile.bio, city: profile.city, district: profile.district,
        avatarUrl: image.url,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile", "me", updated.userId], updated);
      updateUser({ avatar: updated.avatarUrl ?? "" });
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Đã cập nhật ảnh đại diện.");
    },
    onError: (error) => toast.error(error.message),
  });

  function handleFile(file: File | undefined) {
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    upload.mutate(file);
  }

  const initials = profile.displayName.trim().slice(0, 2).toUpperCase() || "ME";
  return <div className="relative h-20 w-20 shrink-0">
    <Avatar className="h-20 w-20 ring-2 ring-mint">
      {profile.avatarUrl && <AvatarImage src={cloudinaryImage(profile.avatarUrl, { width: 160, height: 160 })} alt={profile.displayName} className="object-cover" />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
    {upload.isPending && <div role="status" aria-label="Đang tải ảnh lên" className="absolute inset-0 grid place-items-center rounded-full bg-navy/50 text-white"><Loader2 className="h-6 w-6 animate-spin" /></div>}
    <button type="button" disabled={upload.isPending} onClick={() => inputRef.current?.click()}
      aria-label="Đổi ảnh đại diện" title="Đổi ảnh đại diện"
      className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-navy text-white shadow-md ring-2 ring-card transition-colors hover:bg-navy/90 focus-visible:outline-none focus-visible:ring-teal disabled:opacity-60">
      <Camera className="h-4 w-4" />
    </button>
    <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} className="sr-only" tabIndex={-1} aria-hidden="true"
      onChange={event => { handleFile(event.target.files?.[0]); event.target.value = ""; }} />
  </div>;
}
