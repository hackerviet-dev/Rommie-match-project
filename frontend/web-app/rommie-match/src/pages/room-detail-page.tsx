import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/common/query-state";
import { roomsApi } from "@/features/rooms/services/rooms-api";
import { chatApi } from "@/features/chat/services/chat-api";
import { useAuthStore } from "@/features/auth";
export default function RoomDetailPage() {
  const { id = "" } = useParams(),
    me = useAuthStore((s) => s.user?.id),
    navigate = useNavigate(),
    query = useQuery({
      queryKey: ["rooms", "detail", me, id],
      queryFn: () => roomsApi.get(id),
    }),
    chat = useMutation({
      mutationFn: (owner: string) => chatApi.start(owner),
      onSuccess: (c) => navigate(`/chat?conversation=${c.id}`),
    }),
    r = query.isError ? undefined : query.data;
  const position = r
    ? r.latitude !== null && r.longitude !== null
      ? `${r.latitude},${r.longitude}`
      : `${r.address}, ${r.district}, ${r.city}`
    : "";
  return (
    <AppShell>
      <Link to="/rooms" className="text-teal">
        ← Tìm phòng
      </Link>
      <QueryState query={query} />
      {r && (
        <Card className="mt-5 rounded-3xl p-6 sm:p-8">
          <p className="text-teal">
            {r.isActive ? "Đang tìm người ở ghép" : "Tin đã ẩn"}
          </p>
          <h1 className="mt-2 text-3xl font-display font-bold">{r.title}</h1>
          <p className="mt-3 text-muted-foreground">
            {r.address}, {r.district}, {r.city}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              [
                "Tiền thuê",
                `${r.monthlyRent.toLocaleString("vi-VN")}₫ / tháng`,
              ],
              ["Tiền cọc", `${r.deposit.toLocaleString("vi-VN")}₫`],
              ["Dọn vào từ", r.availableFrom],
              ["Số người tối đa", r.maxOccupants],
              ["Diện tích", r.areaM2 ? `${r.areaM2} m²` : "Chưa cung cấp"],
              ["Cần thêm", r.roommatesNeeded ?? "Chưa cung cấp"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <p className="mt-6 whitespace-pre-wrap">
            {r.description || "Chưa có mô tả."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {r.amenities.map((a) => (
              <span
                key={a}
                className="rounded-full bg-mint/30 px-3 py-1 text-sm"
              >
                {a}
              </span>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            {r.ownerUserId === me ? (
              <Button asChild>
                <Link to={`/rooms/${id}/edit`}>Chỉnh sửa phòng</Link>
              </Button>
            ) : (
              <Button
                disabled={chat.isPending}
                onClick={() =>
                  me ? chat.mutate(r.ownerUserId) : navigate("/login")
                }
              >
                Liên hệ {r.ownerDisplayName}
              </Button>
            )}
            <Button asChild variant="outline">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(position)}`}
                target="_blank"
                rel="noreferrer"
              >
                Mở Google Maps
              </a>
            </Button>
          </div>
          {chat.isError && (
            <p role="alert" className="mt-3 text-destructive">
              {chat.error.message}
            </p>
          )}
          <iframe
            title="Vị trí phòng trên Google Maps"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(position)}&output=embed`}
            className="mt-6 h-80 w-full rounded-2xl border-0"
          />
        </Card>
      )}
    </AppShell>
  );
}
