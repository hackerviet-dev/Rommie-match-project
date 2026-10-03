import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/common/query-state";
import { billingApi } from "@/features/billing";
import { useAuthStore } from "@/features/auth";
import { Check, Sparkles } from "lucide-react";
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
        <span className="inline-flex items-center gap-2 rounded-full bg-mint/40 px-3 py-1 text-sm text-navy">
          <Sparkles className="h-3 w-3" />
          Premium
        </span>
        <h1 className="mt-3 text-4xl font-display font-bold">
          Ghép thông minh.{" "}
          <span className="text-gradient-brand">Dọn vào nhanh.</span>
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
            className={`relative flex flex-col overflow-hidden rounded-3xl border-0 p-8 ${p.tier === "premium" && p.durationMonths === 1 ? "gradient-brand text-white shadow-xl" : "shadow-sm"}`}
          >
            <h2 className="text-xl font-semibold">{p.name}</h2>
            <p className="mt-4 text-4xl font-display font-bold">
              {p.price.toLocaleString("vi-VN")}₫
            </p>
            <p
              className={`mt-2 text-sm ${p.tier === "premium" && p.durationMonths === 1 ? "text-white/80" : "text-muted-foreground"}`}
            >
              {p.durationMonths
                ? `${p.durationMonths} tháng · Thanh toán một lần`
                : "Miễn phí"}
            </p>
            <ul className="my-6 flex-1 space-y-3 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className={`w-full rounded-xl ${p.tier === "premium" && p.durationMonths === 1 ? "bg-white text-navy hover:bg-white/90" : ""}`}
              disabled={buy.isPending || (p.price > 0 && Boolean(me) && !ready)}
              onClick={() =>
                !me
                  ? navigate(p.price > 0 ? "/login" : "/register", {
                      state: { returnTo: "/premium" },
                    })
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
      {plans.data && (
        <section className="mx-auto mt-12 max-w-4xl">
          <h2 className="text-center font-display text-2xl font-bold">
            So sánh các gói
          </h2>
          <Card className="mt-6 overflow-x-auto rounded-3xl border-0 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-4 text-left">Quyền lợi</th>
                  {plans.data.map((p) => (
                    <th key={p.code} className="p-4 text-center">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <th className="p-4 text-left font-normal">Giá gói</th>
                  {plans.data.map((p) => (
                    <td key={p.code} className="p-4 text-center font-semibold">
                      {p.price.toLocaleString("vi-VN")}₫
                    </td>
                  ))}
                </tr>
                <tr className="border-t">
                  <th className="p-4 text-left font-normal">Thời hạn</th>
                  {plans.data.map((p) => (
                    <td key={p.code} className="p-4 text-center">
                      {p.durationMonths
                        ? `${p.durationMonths} tháng`
                        : "Miễn phí"}
                    </td>
                  ))}
                </tr>
                <tr className="border-t">
                  <th className="p-4 text-left align-top font-normal">
                    Quyền lợi của gói
                  </th>
                  {plans.data.map((p) => (
                    <td key={p.code} className="p-4 align-top">
                      <ul className="space-y-3">
                        {p.features.map((f) => (
                          <li key={f} className="flex gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Card>
        </section>
      )}
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
