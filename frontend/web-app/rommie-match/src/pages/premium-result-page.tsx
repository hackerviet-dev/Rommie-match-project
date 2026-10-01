import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { AppShell } from "@/layouts/main-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { billingApi } from "@/features/billing";
import { useAuthStore } from "@/features/auth";

export default function PremiumResultPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const paymentId = params.get("paymentId");
  const token = useAuthStore((state) => state.accessToken);
  const payment = useQuery({
    queryKey: ["payment", paymentId, token],
    queryFn: () => billingApi.payment(paymentId!),
    enabled: Boolean(paymentId && token),
    refetchInterval: (query) => query.state.data?.status === "pending" ? 2000 : false,
    retry: 1,
  });

  const status = payment.data?.status;
  const message = !paymentId
    ? "Liên kết thanh toán không hợp lệ."
    : !token
      ? "Hãy đăng nhập để xem kết quả thanh toán của bạn."
      : payment.isPending
        ? "Đang kiểm tra trạng thái thanh toán…"
        : payment.isError
          ? payment.error.message
          : status === "paid"
            ? "Thanh toán thành công. Gói Premium đã được kích hoạt."
            : status === "pending"
              ? "Đơn đang chờ payOS xác nhận. Trang này sẽ tự cập nhật."
              : "Đơn chưa được thanh toán. Bạn có thể thử lại từ trang Premium.";

  return (
    <AppShell>
      <Card className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-display font-bold">Kết quả thanh toán</h1>
        <p role="status" className="mt-4 text-muted-foreground">{message}</p>
        <div className="mt-6 flex justify-center gap-3">
          {!token && paymentId ? (
            <Button asChild><Link to="/login" state={{ returnTo: `/premium/result${location.search}` }}>Đăng nhập</Link></Button>
          ) : (
            <Button asChild><Link to="/premium">Về trang Premium</Link></Button>
          )}
          {payment.isError && token && <Button variant="outline" onClick={() => void payment.refetch()}>Thử lại</Button>}
        </div>
      </Card>
    </AppShell>
  );
}
