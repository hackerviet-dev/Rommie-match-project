import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/common/query-state";
import { billingApi, PaymentModeNotice } from "@/features/billing";
import { useAuthStore } from "@/features/auth";
export default function PaymentDetailPage() {
  const { id = "" } = useParams(),
    me = useAuthStore((s) => s.user?.id),
    client = useQueryClient(),
    [reason, setReason] = useState(""),
    query = useQuery({
      queryKey: ["billing", "payment", me, id],
      queryFn: () => billingApi.payment(id),
      refetchInterval: (q) =>
        q.state.data?.status === "pending" ? 5000 : false,
    }),
    refund = useMutation({
      mutationFn: () => billingApi.refund(id, reason),
      onSuccess: () => {
        void client.invalidateQueries({ queryKey: ["billing"] });
        void client.invalidateQueries({ queryKey: ["subscription"] });
      },
    }),
    p = query.data;
  return (
    <AppShell>
      <Link to="/settings?section=billing" className="text-teal">
        ← Gói & thanh toán
      </Link>
      <QueryState query={query} />
      {p && (
        <Card className="mt-5 rounded-3xl p-7">
          <h1 className="text-2xl font-display font-bold">
            Chi tiết giao dịch
          </h1>
          <PaymentModeNotice provider={p.provider} />
          <dl className="mt-5 space-y-3">
            <div>
              <dt className="text-sm text-muted-foreground">Mã giao dịch</dt>
              <dd className="break-all">{p.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Gói</dt>
              <dd>{p.planCode}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Số tiền</dt>
              <dd className="text-xl font-semibold">
                {p.amount.toLocaleString("vi-VN")}₫
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Trạng thái</dt>
              <dd>{p.status}</dd>
            </div>
          </dl>
          {p.refundRequest && (
            <p className="mt-5 rounded-xl bg-muted p-4">
              Hoàn tiền: {p.refundRequest.status} ·{" "}
              {p.refundRequest.resolutionNote}
            </p>
          )}
          {p.refundableUntil && new Date(p.refundableUntil) > new Date() && (
            <div className="mt-6 border-t pt-5">
              <h2 className="font-semibold">Yêu cầu hoàn tiền</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {p.provider === "mock" ? "Hoàn tiền giả lập chỉ cập nhật trạng thái kiểm thử, không chuyển tiền thật." : "Giao dịch payOS được hoàn bằng chuyển khoản thủ công sau khi quản trị xử lý yêu cầu."}
              </p>
              <textarea
                aria-label="Lý do hoàn tiền"
                value={reason}
                maxLength={1000}
                onChange={(e) => setReason(e.target.value)}
                className="mt-3 w-full rounded-xl border p-3"
                placeholder="Lý do (tùy chọn)"
              />
              <Button
                className="mt-3"
                variant="outline"
                disabled={refund.isPending}
                onClick={() => refund.mutate()}
              >
                Gửi yêu cầu hoàn tiền
              </Button>
            </div>
          )}
          {refund.isError && (
            <p role="alert" className="mt-3 text-destructive">
              {refund.error.message}
            </p>
          )}
          {refund.isSuccess && (
            <p role="status" className="mt-3 text-teal">
              Yêu cầu đã được xử lý. Xem trạng thái giao dịch phía trên.
            </p>
          )}
        </Card>
      )}
    </AppShell>
  );
}
