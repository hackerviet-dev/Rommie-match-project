import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRound, ShieldCheck } from "lucide-react";
import { profileApi } from "@/features/profile";
import { useAuthStore } from "@/features/auth";
import { apiClient } from "@/services/api-client";
import { Button } from "@/components/ui/button";
import type { Room } from "../types/room-types";

type Resident = { userId: string; displayName: string; avatarUrl: string | null };
type Residents = { residents: Resident[]; canShare: boolean; isSharing: boolean };
type RoomLifestyle = { sleepSchedule: string; socialStyle: string; cleanliness: number; smoking: boolean; petFriendly: boolean };
function Person({ userId, displayName, avatarUrl }: Resident) {
  return <div className="flex items-center gap-3">{avatarUrl ? <img src={avatarUrl} alt={`Ảnh đại diện ${displayName}`} className="h-14 w-14 rounded-full object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mint/30"><UserRound /></span>}<div><p className="font-semibold">{displayName}</p><Link to={`/profile/${userId}`} className="text-sm text-teal hover:underline">Xem hồ sơ và lối sống</Link></div></div>;
}
export function RoomPeople({ room, onContact, isContactPending }: { room: Room; onContact: () => void; isContactPending: boolean }) {
  const me = useAuthStore(s => s.user?.id), client = useQueryClient();
  const profile = useQuery({ queryKey: ["profile", me, room.ownerUserId], queryFn: () => profileApi.getByUserId(room.ownerUserId), enabled: Boolean(me) });
  const habits = useQuery({ queryKey: ["profile", "room-lifestyle", me, room.ownerUserId], queryFn: () => apiClient<RoomLifestyle>(`/api/users/${room.ownerUserId}/lifestyle`, { authenticated: true }), enabled: Boolean(me && profile.data), retry: false });
  const residents = useQuery({ queryKey: ["rooms", "residents", me, room.id], queryFn: () => apiClient<Residents>(`/api/rooms/${room.id}/residents`, { authenticated: Boolean(me) }) });
  const visibility = useMutation({ mutationFn: (share: boolean) => apiClient<void>(`/api/rooms/${room.id}/residents/visibility`, { method: "PUT", authenticated: true, body: { share } }), onSuccess: () => client.invalidateQueries({ queryKey: ["rooms", "residents"] }) });
  const p = profile.data, lifestyle = habits.data;
  const sleep = { early: "Trước 22h", normal: "22h–0h", late: "Sau 0h" }[lifestyle?.sleepSchedule ?? ""];
  const social = { introvert: "Thích yên tĩnh", extrovert: "Thích giao lưu" }[lifestyle?.socialStyle ?? ""];
  return <section className="space-y-6 rounded-3xl border bg-white p-6 sm:p-8">
    <div><h2 className="mb-5 text-xl font-display font-bold">Người đăng phòng</h2><Person userId={room.ownerUserId} displayName={room.ownerDisplayName} avatarUrl={room.ownerAvatarUrl} /></div>
    {p && <div className="space-y-3">{p.isVerified && <p className="flex items-center gap-2 text-sm text-teal"><ShieldCheck size={16} /> Đã xác minh danh tính</p>}{p.bio && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{p.bio}</p>}{p.occupation && <p className="text-sm">Tình trạng: {p.occupation}</p>}<div className="flex flex-wrap gap-2">{[sleep && `Giờ ngủ: ${sleep}`, social, lifestyle && `Sạch sẽ: ${lifestyle.cleanliness}/5`, lifestyle && `Hút thuốc: ${lifestyle.smoking ? "Có" : "Không"}`, lifestyle && `Thú cưng: ${lifestyle.petFriendly ? "Có" : "Không"}`].filter(Boolean).map(t => <span key={String(t)} className="rounded-full bg-mint/20 px-3 py-1 text-xs">{t}</span>)}</div></div>}
    {profile.isError && <p role="alert" className="text-sm text-muted-foreground">Không tải được thông tin lối sống. <button type="button" className="text-teal underline" onClick={() => void profile.refetch()}>Thử lại</button></p>}
    {!me && <p className="text-sm text-muted-foreground">Đăng nhập để xem hồ sơ, lối sống và trao đổi với người đăng.</p>}
    {room.ownerUserId !== me && <Button className="w-full sm:w-auto" onClick={onContact} disabled={isContactPending}>{isContactPending ? "Đang mở hội thoại…" : "Nhắn tin người đăng"}</Button>}
    <div className="border-t pt-5"><h3 className="mb-3 font-semibold">Thành viên nhóm ở ghép tại phòng</h3><p className="mb-4 text-sm text-muted-foreground">Chỉ hiển thị thành viên chính thức đã đồng ý công khai liên kết hồ sơ; thông tin nhóm không thay thế xác minh chỗ ở thực tế.</p>
      {residents.isPending && <p role="status" className="text-sm">Đang tải thành viên…</p>}
      {residents.isError && <p role="alert" className="text-sm text-destructive">Không tải được thành viên. <button type="button" className="underline" onClick={() => void residents.refetch()}>Thử lại</button></p>}
      {residents.data && !residents.data.residents.length && <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">Chưa có thành viên đồng ý hiển thị hồ sơ.</p>}
      <div className="grid gap-4 sm:grid-cols-2">{residents.data?.residents.map(person => <Person key={person.userId} {...person} />)}</div>
      {residents.data?.canShare && <label className="mt-5 flex items-start gap-2 text-sm"><input type="checkbox" checked={residents.data.isSharing} disabled={visibility.isPending} onChange={e => visibility.mutate(e.target.checked)} className="mt-1" />Đồng ý hiển thị tên, ảnh đại diện và liên kết hồ sơ của tôi trên tin phòng này.</label>}
      {visibility.isError && <p role="alert" className="mt-2 text-sm text-destructive">{visibility.error.message}</p>}
    </div>
  </section>;
}
