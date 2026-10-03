import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { roomReviewSchema as schema } from "../schemas/room-review-schema";
import { toast } from "sonner";
import { staffApi, type StaffRoom } from "../services/staff-api";
import { useAuthStore } from "@/features/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState, Pagination } from "@/components/common/query-state";
function RoomReview({ room }: { room: StaffRoom }) {
  const client = useQueryClient(),
    form = useForm<z.infer<typeof schema>>({
      resolver: zodResolver(schema),
      defaultValues: { note: "", status: "approved" },
    });
  const save = useMutation({
    mutationFn: (v: z.infer<typeof schema>) =>
      staffApi.review(room.id, { ...v, expectedUpdatedAt: room.updatedAt }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["staff"] });
      void client.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Đã lưu kết quả kiểm duyệt tin.");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Card className="rounded-2xl border-slate-200 p-6 shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{room.title}</h2>
          <Link
            to={`/admin/users/${room.ownerUserId}`}
            className="mt-1 inline-block text-sm text-indigo-600"
          >
            {room.ownerName}
          </Link>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs ${room.status === "approved" ? "bg-emerald-50 text-emerald-700" : room.status === "rejected" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}
        >
          {room.status === "approved"
            ? "Đã duyệt"
            : room.status === "pending"
              ? "Chờ duyệt"
              : "Từ chối / gỡ hiển thị"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <p className="rounded-xl bg-slate-50 p-3">
          Địa chỉ: {room.address}, {room.district}, {room.city}
        </p>
        <p className="rounded-xl bg-slate-50 p-3">
          Giá thuê: {room.monthlyRent.toLocaleString("vi-VN")}₫ · Cọc:{" "}
          {room.deposit.toLocaleString("vi-VN")}₫
        </p>
      </div>
      <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <p>
          Loại nhà:{" "}
          {{
            apartment: "Căn hộ",
            house: "Nhà nguyên căn",
            studio: "Studio",
            dormitory: "Ký túc xá",
          }[room.propertyType ?? ""] ?? "Chưa cập nhật"}
        </p>
        <p>
          Diện tích: {room.areaM2 ?? "—"} m² · Phòng ngủ: {room.bedrooms ?? "—"}
        </p>
        <p>
          Số người tối đa: {room.maxOccupants} · Cần thêm:{" "}
          {room.roommatesNeeded ?? "—"}
        </p>
        <p>
          Dọn vào:{" "}
          {new Date(room.availableFrom + "T00:00:00").toLocaleDateString(
            "vi-VN",
          )}
        </p>
        <p className="sm:col-span-2">
          Tiện ích: {room.amenities?.join(", ") || "Chưa cập nhật"}
        </p>
        <p>Trạng thái chủ tin: {room.isActive ? "Đang bật" : "Đã ẩn"}</p>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm text-slate-600">
        {room.description || "Không có mô tả bổ sung."}
      </p>
      {room.note && (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
          Ghi chú kiểm duyệt: {room.note}
        </p>
      )}
      <form
        className="mt-5 flex flex-wrap items-start gap-3 border-t pt-4"
        onSubmit={form.handleSubmit((v) => save.mutate(v))}
      >
        <div className="min-w-48 flex-1">
          <textarea
            aria-label={`Ghi chú kiểm duyệt ${room.title}`}
            placeholder="Ghi rõ lý do duyệt hoặc từ chối"
            maxLength={2000}
            className="min-h-20 w-full rounded-xl border p-3 text-sm"
            {...form.register("note")}
          />
          <p className="text-xs text-destructive">
            {form.formState.errors.note?.message}
          </p>
        </div>
        <select
          aria-label={`Kết quả kiểm duyệt ${room.title}`}
          className="rounded-xl border bg-white p-3 text-sm"
          {...form.register("status")}
        >
          <option value="approved">Duyệt hiển thị</option>
          <option value="rejected">Từ chối / gỡ hiển thị</option>
        </select>
        <Button disabled={save.isPending}>Lưu kết quả</Button>
      </form>
    </Card>
  );
}
export function RoomModeration() {
  const [params] = useSearchParams(),
    [status, setStatus] = useState(params.get("room") ? "" : "pending"),
    [page, setPage] = useState(1),
    me = useAuthStore((s) => s.user?.id);
  const query = useQuery({
    queryKey: ["staff", "rooms", me, status, page, params.get("room")],
    queryFn: () => staffApi.rooms(status, page, params.get("room") ?? ""),
  });
  return (
    <div>
      <h1 className="text-2xl font-display font-bold">Kiểm duyệt tin đăng</h1>
      <p className="mt-2 text-sm text-slate-500">
        Tin mới hoặc nội dung sửa cần được duyệt trước khi xuất hiện trong tìm
        phòng.
      </p>
      <select
        aria-label="Trạng thái tin đăng"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          setPage(1);
        }}
        className="my-6 rounded-xl border bg-white p-3 text-sm"
      >
        <option value="pending">Chờ duyệt</option>
        <option value="approved">Đã duyệt</option>
        <option value="rejected">Đã từ chối</option>
        <option value="">Tất cả</option>
      </select>
      <QueryState query={query} />
      <div className="space-y-4">
        {query.data?.items
          .filter((r) => !params.get("room") || params.get("room") === r.id)
          .map((r) => (
            <RoomReview key={r.id + r.updatedAt + r.status} room={r} />
          ))}
      </div>
      {query.data?.totalCount === 0 && (
        <Card className="rounded-2xl p-10 text-center text-sm text-slate-500">
          Không có tin trong trạng thái này.
        </Card>
      )}
      {query.data && (
        <Pagination
          page={page}
          hasNext={query.data.hasNextPage}
          onChange={setPage}
        />
      )}
    </div>
  );
}
