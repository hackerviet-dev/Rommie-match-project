import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState, Pagination } from "@/components/common/query-state";
import type { AccountSection } from "@/constants/account-sections";
import { useAuthStore } from "@/features/auth";
import { roomsApi } from "@/features/rooms/services/rooms-api";
import { bookingsApi } from "@/features/hyperlocal/services/bookings-api";
import { bookingStatusLabel } from "@/features/hyperlocal/utils/booking-status";
import { billingApi } from "@/features/billing";
import { matchingApi } from "@/features/matching";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function AccountPreviewPanels({ section }: { section: AccountSection }) {
  if (section === "rooms") return <MyRooms />;
  if (section === "bookings") return <MyBookings />;
  if (section === "billing") return <MyBilling />;
  return null;
}
function MyRooms() {
  const me = useAuthStore((s) => s.user?.id),
    client = useQueryClient(),
    [deleteId, setDeleteId] = useState<string | null>(null),
    query = useQuery({
      queryKey: ["rooms", "mine", me],
      queryFn: roomsApi.mine,
    }),
    remove = useMutation({
      mutationFn: roomsApi.remove,
      onSuccess: () => {
        setDeleteId(null);
        void client.invalidateQueries({ queryKey: ["rooms"] });
      },
    });
  return (
    <>
      <Button asChild>
        <Link to="/rooms/new">+ Đăng phòng</Link>
      </Button>
      <QueryState query={query} />
      {query.data?.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">
          Bạn chưa đăng phòng nào.
        </p>
      )}
      <div className="mt-5 space-y-4">
        {query.data?.map((r) => (
          <Card
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5"
          >
            <div>
              <h2 className="font-semibold">{r.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {r.monthlyRent.toLocaleString("vi-VN")}₫ ·{" "}
                {r.moderationStatus === "pending"
                  ? "Chờ kiểm duyệt"
                  : r.moderationStatus === "rejected"
                    ? "Bị từ chối"
                    : r.isActive
                      ? "Đang hiển thị"
                      : "Đã ẩn"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to={`/rooms/${r.id}`}>Xem</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`/rooms/${r.id}/edit`}>Sửa</Link>
              </Button>
              <Button variant="destructive" onClick={() => setDeleteId(r.id)}>
                Xóa
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Dialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa tin phòng?</DialogTitle>
            <DialogDescription>
              Tin sẽ bị xóa khỏi danh sách phòng của bạn và tìm kiếm.
            </DialogDescription>
          </DialogHeader>
          {remove.isError && (
            <p role="alert" className="text-destructive">
              {remove.error.message}
            </p>
          )}
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => deleteId && remove.mutate(deleteId)}
          >
            Xác nhận xóa
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
function MyBookings() {
  const [page, setPage] = useState(1),
    me = useAuthStore((s) => s.user?.id),
    query = useQuery({
      queryKey: ["bookings", "list", me, page],
      queryFn: () => bookingsApi.list(page),
    });
  return (
    <>
      <QueryState query={query} />
      {query.data?.totalCount === 0 && (
        <p className="py-10 text-center text-muted-foreground">
          Chưa có lịch đặt.{" "}
          <Link className="text-teal underline" to="/services">
            Khám phá dịch vụ
          </Link>
        </p>
      )}
      <div className="space-y-4">
        {query.data?.items.map((b) => (
          <Card
            key={b.id}
            className="flex items-center justify-between gap-3 rounded-2xl p-5"
          >
            <div>
              <h2 className="font-semibold">{b.serviceName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(b.scheduledAt).toLocaleString("vi-VN")} ·{" "}
                {bookingStatusLabel(b.status)}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to={`/bookings/${b.id}`}>Chi tiết</Link>
            </Button>
          </Card>
        ))}
      </div>
      {query.data && (
        <Pagination
          page={page}
          hasNext={query.data.hasNextPage}
          onChange={setPage}
        />
      )}
    </>
  );
}
function MyBilling() {
  const me = useAuthStore((s) => s.user?.id),
    client = useQueryClient(),
    subscription = useQuery({
      queryKey: ["subscription", "me", me],
      queryFn: billingApi.subscription,
    }),
    query = useQuery({
      queryKey: ["billing", "payments", me],
      queryFn: billingApi.payments,
    }),
    usage = useQuery({
      queryKey: ["matching", "usage", me],
      queryFn: matchingApi.usage,
    }),
    boost = useMutation({
      mutationFn: matchingApi.boost,
      onSuccess: () => client.invalidateQueries({ queryKey: ["matching"] }),
    });
  return (
    <div className="space-y-5">
      <Card className="rounded-2xl p-6">
        <h2 className="text-xl font-semibold">Gói hiện tại</h2>
        <QueryState query={subscription} />
        {subscription.data && (
          <p className="mt-3">
            {subscription.data.isPremium ? "Premium" : "Miễn phí"}
            {subscription.data.endsAt
              ? ` · Đến ${new Date(subscription.data.endsAt).toLocaleDateString("vi-VN")}`
              : ""}
          </p>
        )}
        <Button asChild className="mt-4">
          <Link to="/premium">Xem các gói</Link>
        </Button>
        <QueryState query={usage} />
        {usage.data && (
          <div className="mt-4">
            <p className="text-sm">
              Lượt quét còn lại: {usage.data.scansRemaining ?? "Không giới hạn"}{" "}
              · Boost {usage.data.boostsUsed}/{usage.data.boostsLimit}
            </p>
            {usage.data.activeBoost ? (
              <p className="mt-2 text-sm text-teal">
                Đang Boost đến{" "}
                {new Date(usage.data.activeBoost.endsAt).toLocaleString(
                  "vi-VN",
                )}
              </p>
            ) : (
              <Button
                variant="outline"
                className="mt-3"
                disabled={
                  boost.isPending ||
                  !usage.data.isPremium ||
                  usage.data.boostsUsed >= usage.data.boostsLimit
                }
                onClick={() => boost.mutate()}
              >
                Boost hồ sơ
              </Button>
            )}
          </div>
        )}
        {boost.isError && (
          <p role="alert" className="mt-3 text-destructive">
            {boost.error.message}
          </p>
        )}
      </Card>
      <h2 className="text-xl font-semibold">Lịch sử thanh toán</h2>
      <QueryState query={query} />
      {query.data?.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          Chưa có giao dịch.
        </p>
      )}
      {query.data?.map((p) => (
        <Card
          key={p.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5"
        >
          <div>
            <h3 className="font-semibold">
              {p.planCode} · {p.amount.toLocaleString("vi-VN")}₫
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(p.createdAt).toLocaleString("vi-VN")} · {p.status}
            </p>
            {p.refundRequest && (
              <p className="text-sm">
                Yêu cầu hoàn tiền: {p.refundRequest.status}
              </p>
            )}
          </div>
          <Button asChild variant="outline">
            <Link to={`/payments/${p.id}`}>Chi tiết</Link>
          </Button>
        </Card>
      ))}
    </div>
  );
}
