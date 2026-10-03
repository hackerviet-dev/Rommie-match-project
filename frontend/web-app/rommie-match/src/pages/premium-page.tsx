import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/common/query-state";
import { billingApi } from "@/features/billing";
import { useAuthStore } from "@/features/auth";
export default function PremiumPage() {
  const me = useAuthStore((s) => s.user?.id),
    navigate = useNavigate(),
    plans = useQuery({
      queryKey: ["billing", "plans"],
      queryFn: billingApi.plans,
    }),
    health = useQuery({
      queryKey: ["billing", "health"],
      queryFn: billingApi.health,
      retry: false,
    }),
    subscription = useQuery({
      queryKey: ["subscription", "me", me],
      queryFn: billingApi.subscription,
      enabled: Boolean(me),
    }),
    buy = useMutation({
      mutationFn: billingApi.checkout,
      onSuccess: (r) => window.location.assign(r.paymentUrl),
    });
  const ready =
    health.data?.provider === "payos" || health.data?.provider === "mock";
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-semibold text-teal">RoomieMatch Premium</p>
        <h1 className="mt-3 text-4xl font-display font-bold">
          Thêm cơ hội tìm người phù hợp
        </h1>
        <p className="mt-4 text-muted-foreground">
          Chọn gói với quyền lợi và mức giá hiện tại.
        </p>
        {subscription.data && (
          <p className="mt-4 rounded-full bg-mint/30 p-3">
            Gói của bạn: {subscription.data.isPremium ? "Premium" : "Miễn phí"}
            {subscription.data.endsAt
              ? ` · Đến ${new Date(subscription.data.endsAt).toLocaleDateString("vi-VN")}`
              : ""}
          </p>
        )}
      </div>
      <QueryState query={plans} />
      {me && <QueryState query={subscription} />}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.data?.map((p) => (
          <Card
            key={p.code}
            className={`flex flex-col rounded-3xl p-7 ${p.tier === "premium" ? "border-teal bg-mint/10" : ""}`}
          >
            <h2 className="text-xl font-semibold">{p.name}</h2>
            <p className="mt-4 text-4xl font-display font-bold">
              {p.price.toLocaleString("vi-VN")}₫
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {p.durationMonths
                ? `${p.durationMonths} tháng · Thanh toán một lần`
                : "Miễn phí"}
            </p>
            <ul className="my-6 flex-1 space-y-3 text-sm">
              {p.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <Button
              disabled={buy.isPending || (p.price > 0 && Boolean(me) && !ready)}
              onClick={() =>
                !me
                  ? navigate(p.price > 0 ? "/login" : "/register")
                  : p.price > 0
                    ? buy.mutate(p.code)
                    : navigate("/matches")
              }
            >
              {buy.isPending && buy.variables === p.code
                ? "Đang tạo giao dịch…"
                : p.price === 0
                  ? "Khám phá ở ghép"
                  : "Chọn gói"}
            </Button>
          </Card>
        ))}
      </div>
      <QueryState query={health} />
      {buy.isError && (
        <p role="alert" className="mt-5 text-center text-destructive">
          {buy.error.message}
        </p>
      )}
      {health.data && !ready && (
        <p className="mt-5 text-center text-muted-foreground">
          Cổng thanh toán chưa sẵn sàng.
        </p>
      )}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Gói được cập nhật sau khi hệ thống xác nhận thanh toán.{" "}
        <Link to="/settings?section=billing" className="text-teal underline">
          Lịch sử giao dịch
        </Link>
      </p>
    </AppShell>
  );
}
