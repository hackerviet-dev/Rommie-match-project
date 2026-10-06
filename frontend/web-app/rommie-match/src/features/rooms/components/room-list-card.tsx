import { useState } from "react";
import { Link } from "react-router-dom";
import { Camera, ImageOff, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/features/auth";
import type { Room } from "../types/room-types";

export function RoomListCard({ room }: { room: Room }) {
  const [imageFailed, setImageFailed] = useState(false);
  const userId = useAuthStore((state) => state.user?.id);
  const isOwner = Boolean(userId && room.ownerUserId === userId);
  const photo = room.photoUrls?.[0];
  const published = new Date(room.createdAt);
  return (
    <Card className="overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="flex flex-col gap-5 sm:flex-row">
        <Link to={`/rooms/${room.id}`} aria-label={`Xem phòng: ${room.title}`} className="relative block h-56 shrink-0 overflow-hidden rounded-xl bg-mint/20 sm:w-72">
          {photo && !imageFailed ? <img src={photo} alt={room.title} loading="lazy" onError={() => setImageFailed(true)} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground"><ImageOff className="h-8 w-8" /><span className="text-sm">{photo ? "Không tải được ảnh phòng" : "Chưa có ảnh phòng"}</span></div>}
          {!!room.photoUrls?.length && <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white"><Camera className="h-3.5 w-3.5" />{room.photoUrls.length}<span className="sr-only"> ảnh phòng</span></span>}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col py-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold leading-snug text-navy sm:text-xl"><Link to={`/rooms/${room.id}`} className="hover:text-teal">{room.title}</Link></h2>
            {isOwner && <span className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">Phòng của tôi</span>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <strong className="text-lg text-teal">{room.monthlyRent.toLocaleString("vi-VN")} ₫/tháng</strong>
            {room.areaM2 != null && <span className="text-sm text-muted-foreground">· {room.areaM2.toLocaleString("vi-VN")} m²</span>}
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{room.district}, {room.city}</p>
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{room.description || "Người đăng chưa bổ sung mô tả phòng."}</p>
          <div className="mt-4 flex items-center justify-between gap-3 sm:mt-auto sm:pt-4">
            <Link to={`/profile/${room.ownerUserId}`} className="flex min-w-0 items-center gap-2.5">
              <Avatar className="h-10 w-10 border"><AvatarImage src={room.ownerAvatarUrl ?? undefined} alt={room.ownerDisplayName} /><AvatarFallback>{(room.ownerDisplayName || "T").slice(0,1)}</AvatarFallback></Avatar>
              <div className="min-w-0"><p className="truncate text-sm font-medium">{room.ownerDisplayName || "Người đăng phòng"}</p><p className="mt-0.5 text-xs text-muted-foreground">Đăng {published.toLocaleDateString("vi-VN")}</p></div>
            </Link>
            <Link to={`/rooms/${room.id}`} className="shrink-0 text-sm font-semibold text-teal hover:underline">Xem phòng →</Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
