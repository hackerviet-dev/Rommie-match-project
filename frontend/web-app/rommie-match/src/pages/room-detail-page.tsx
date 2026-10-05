import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MapPin, ArrowLeft, ExternalLink } from "lucide-react";
import { AppShell } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/common/query-state";
import { roomsApi } from "@/features/rooms/services/rooms-api";
import { RoomGallery } from "@/features/rooms/components/room-gallery";
import { RoomPeople } from "@/features/rooms/components/room-people";
import { chatApi } from "@/features/chat/services/chat-api";
import { useAuthStore } from "@/features/auth";

const PROPERTY_LABELS: Record<string, string> = { apartment: "Căn hộ", house: "Nhà nguyên căn", studio: "Studio", dormitory: "Ký túc xá" };
const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`;
const date = (value: string) => new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString("vi-VN");
export default function RoomDetailPage() {
  const { id = "" } = useParams(), me = useAuthStore(s => s.user?.id), navigate = useNavigate();
  const query = useQuery({ queryKey: ["rooms", "detail", me, id], queryFn: () => roomsApi.get(id) });
  const chat = useMutation({ mutationFn: (owner: string) => chatApi.start(owner), onSuccess: c => navigate(`/chat?conversation=${c.id}`) });
  const room = query.isError ? undefined : query.data;
  const position = room ? room.latitude !== null && room.longitude !== null ? `${room.latitude},${room.longitude}` : `${room.address}, ${room.district}, ${room.city}` : "";
  return <AppShell>
    <Link to="/rooms" className="mb-5 inline-flex items-center gap-2 text-teal"><ArrowLeft size={17} /> Tìm phòng</Link>
    <QueryState query={query} />
    {room && <div className="space-y-6">
      <RoomGallery key={room.id} urls={room.photoUrls ?? []} title={room.title} />
      <Card className="rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><span className={`rounded-full px-3 py-1 text-sm ${room.moderationStatus === "approved" && room.isActive ? "bg-mint/30 text-teal" : "bg-amber-50 text-amber-900"}`}>{room.moderationStatus === "pending" ? "Chờ kiểm duyệt" : room.moderationStatus === "rejected" ? "Tin chưa được duyệt" : room.isActive ? "Đang tìm người ở ghép" : "Tin đã ẩn"}</span><p className="text-xs text-muted-foreground">Cập nhật: {date(room.updatedAt)}</p></div>
        {room.ownerUserId === me && room.moderationNote && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Ghi chú kiểm duyệt: {room.moderationNote}</p>}
        <h1 className="mt-4 text-2xl font-display font-bold sm:text-3xl">{room.title}</h1>
        <div className="mt-4 flex flex-wrap items-baseline gap-4"><strong className="text-2xl text-teal">{money(room.monthlyRent)}<span className="text-sm font-normal"> / tháng</span></strong>{room.areaM2 != null && <span>{room.areaM2} m²</span>}<span className="text-sm text-muted-foreground">Giá thuê theo tin đăng</span></div>
        <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground"><MapPin size={18} className="shrink-0" />{room.address}, {room.district}, {room.city}</p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
          ["Tiền cọc", money(room.deposit)], ["Dọn vào từ", date(room.availableFrom)], ["Loại nhà", PROPERTY_LABELS[room.propertyType ?? ""] ?? "Chưa cung cấp"], ["Số người tối đa", room.maxOccupants], ["Cần thêm người", room.roommatesNeeded ?? "Chưa cung cấp"], ["Số phòng ngủ", room.bedrooms ?? "Chưa cung cấp"], ["Khu vực", room.district], ["Thành phố / Tỉnh", room.city], ["Ngày đăng", date(room.createdAt)],
        ].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-muted/40 p-4"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>
        <p className="mt-4 break-all text-xs text-muted-foreground">Mã tin: {room.id}</p>
        {room.ownerUserId === me && <Button asChild className="mt-5" variant="outline"><Link to={`/rooms/${id}/edit`}>Chỉnh sửa tin phòng</Link></Button>}
      </Card>
      <Card className="rounded-3xl p-6 sm:p-8"><h2 className="text-xl font-display font-bold">Thông tin mô tả</h2><p className="mt-4 whitespace-pre-wrap text-muted-foreground">{room.description || "Người đăng chưa bổ sung mô tả."}</p><h3 className="mt-6 font-semibold">Tiện nghi có sẵn</h3><div className="mt-3 flex flex-wrap gap-2">{room.amenities.length ? room.amenities.map(a => <span key={a} className="rounded-full bg-mint/30 px-3 py-1 text-sm">{a}</span>) : <p className="text-sm text-muted-foreground">Chưa cung cấp tiện nghi.</p>}</div></Card>
      <Card className="rounded-3xl p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-display font-bold">Vị trí & bản đồ</h2><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(position)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-teal">Xem bản đồ lớn <ExternalLink size={16} /></a></div><p className="mt-3 text-sm text-muted-foreground">{room.address}, {room.district}, {room.city}</p>{room.latitude == null && <p className="mt-2 text-xs text-amber-800">Bản đồ tìm theo địa chỉ; người đăng chưa cung cấp ghim tọa độ.</p>}<iframe title="Vị trí phòng trên Google Maps" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://maps.google.com/maps?q=${encodeURIComponent(position)}&output=embed`} className="mt-4 h-80 w-full rounded-2xl border-0" /></Card>
      <RoomPeople room={room} onContact={() => me ? chat.mutate(room.ownerUserId) : navigate("/login")} isContactPending={chat.isPending} />
      {chat.isError && <p role="alert" className="text-sm text-destructive">{chat.error.message}</p>}
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Nên xem phòng trực tiếp và trao đổi rõ tiền thuê, tiền cọc, chi phí chung trước khi quyết định ở cùng. Vị trí bản đồ và hồ sơ không chứng minh quyền cho thuê.</p>
    </div>}
  </AppShell>;
}
