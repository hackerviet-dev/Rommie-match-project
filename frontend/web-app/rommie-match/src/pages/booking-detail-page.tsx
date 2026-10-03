import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/common/query-state";
import { bookingsApi } from "@/features/hyperlocal/services/bookings-api";
import { bookingStatusLabel } from "@/features/hyperlocal/utils/booking-status";
import { useAuthStore } from "@/features/auth";
export default function BookingDetailPage() {
  const { id = "" } = useParams(),
    me = useAuthStore((s) => s.user?.id),
    client = useQueryClient(),
    query = useQuery({
      queryKey: ["bookings", "detail", me, id],
      queryFn: () => bookingsApi.get(id),
    }),
    cancel = useMutation({
      mutationFn: () => bookingsApi.cancel(id),
      onSuccess: () => client.invalidateQueries({ queryKey: ["bookings"] }),
    }),
    b = query.data;
  return (
    <AppShell>
      <Link className="text-teal" to="/settings?section=bookings">
        ← Lịch đặt dịch vụ
      </Link>
      <QueryState query={query} />
      {b && (
        <Card className="mt-5 rounded-3xl p-7">
          <h1 className="text-3xl font-display font-bold">{b.serviceName}</h1>
          <p className="mt-3 text-teal">{bookingStatusLabel(b.status)}</p>
          <dl className="mt-6 space-y-4">
            <div>
              <dt className="text-sm text-muted-foreground">Thời gian hẹn</dt>
              <dd>{new Date(b.scheduledAt).toLocaleString("vi-VN")}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Địa chỉ</dt>
              <dd>{b.address}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Điện thoại</dt>
              <dd>{b.contactPhone}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Ghi chú</dt>
              <dd>{b.note || "Không có"}</dd>
            </div>
          </dl>
          <div className="mt-6 flex gap-3">
            {b.servicePhone && (
              <Button asChild variant="outline">
                <a href={`tel:${b.servicePhone}`}>Gọi nhà cung cấp</a>
              </Button>
            )}
            {b.status !== "cancelled" &&
              new Date(b.scheduledAt) > new Date() && (
                <Button
                  variant="destructive"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate()}
                >
                  Hủy lịch đặt
                </Button>
              )}
          </div>
          {cancel.isError && (
            <p role="alert" className="mt-3 text-destructive">
              {cancel.error.message}
            </p>
          )}
        </Card>
      )}
    </AppShell>
  );
}
