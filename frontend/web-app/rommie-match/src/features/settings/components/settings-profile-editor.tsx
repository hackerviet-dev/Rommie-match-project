import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { profileApi, type Profile } from "@/features/profile";
import { useAuthStore } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { settingsProfileSchema, type SettingsProfileValues } from "../schemas/settings-profile-schema";

export function SettingsProfileEditor({ profile, onSaved }: { profile: Profile; onSaved?: () => void }) {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore(state => state.updateUser);
  const form = useForm<SettingsProfileValues>({
    resolver: zodResolver(settingsProfileSchema),
    defaultValues: {
      displayName: profile.displayName, city: profile.city, birthDate: profile.birthDate ?? "",
      gender: (profile.gender ?? "") as SettingsProfileValues["gender"],
      occupation: profile.occupation ?? "", district: profile.district ?? "", bio: profile.bio ?? "",
    },
  });
  const save = useMutation({
    mutationFn: (values: SettingsProfileValues) => profileApi.updateMine({
      ...values, birthDate: values.birthDate || null, gender: values.gender || null,
      occupation: values.occupation || null, district: values.district || null,
      bio: values.bio || null, avatarUrl: profile.avatarUrl,
    }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile", "me", updated.userId], updated);
      updateUser({ name: updated.displayName });
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Đã lưu thông tin cá nhân.");
      onSaved?.();
    },
  });
  const fields = [
    ["displayName", "Tên hiển thị", "text"], ["birthDate", "Ngày sinh", "date"],
    ["city", "Thành phố", "text"], ["district", "Quận / huyện", "text"],
    ["occupation", "Nghề nghiệp", "text"],
  ] as const;
  return <form onSubmit={form.handleSubmit(values => save.mutate(values))} className="space-y-4">
    <div className="grid sm:grid-cols-2 gap-3">
      {fields.map(([field, label, type]) => <div key={field}>
        <Label htmlFor={`settings-${field}`}>{label}</Label>
        <Input {...form.register(field)} id={`settings-${field}`} type={type}
          aria-invalid={Boolean(form.formState.errors[field])}
          aria-describedby={form.formState.errors[field] ? `settings-error-${field}` : undefined}
          className={`mt-1.5 h-10 rounded-xl ${form.formState.errors[field] ? "border-destructive" : ""}`} />
        {form.formState.errors[field] && <p id={`settings-error-${field}`} role="alert" className="text-xs text-destructive mt-1">{form.formState.errors[field]?.message}</p>}
      </div>)}
      <div>
        <Label htmlFor="settings-gender">Giới tính</Label>
        <select {...form.register("gender")} id="settings-gender" className="mt-1.5 h-10 w-full rounded-xl border bg-background px-3 text-sm">
          <option value="">Chưa cập nhật</option><option value="male">Nam</option>
          <option value="female">Nữ</option><option value="other">Khác</option>
        </select>
      </div>
    </div>
    <div>
      <Label htmlFor="settings-bio">Giới thiệu</Label>
      <Input {...form.register("bio")} id="settings-bio" className="mt-1.5 rounded-xl" aria-invalid={Boolean(form.formState.errors.bio)} />
      {form.formState.errors.bio && <p role="alert" className="text-xs text-destructive">{form.formState.errors.bio.message}</p>}
    </div>
    {save.error && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
    <Button disabled={save.isPending} className="rounded-xl bg-navy text-white">{save.isPending ? "Đang lưu…" : "Lưu thay đổi"}</Button>
  </form>;
}
