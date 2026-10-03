import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { bookingSchema as schema } from "@/features/hyperlocal/schemas/booking-schema";
import { AppShell } from "@/layouts/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryState } from "@/components/common/query-state";
import { hyperlocalApi } from "@/features/hyperlocal";
import { bookingsApi } from "@/features/hyperlocal/services/bookings-api";
import { useAuthStore } from "@/features/auth";
export default function ServiceDetailPage() {
  const { id = "" } = useParams(),
    me = useAuthStore((s) => s.user?.id),
    navigate = useNavigate(),
    client = useQueryClient(),
    query = useQuery({
      queryKey: ["services", "detail", id],
      queryFn: () => hyperlocalApi.get(id),
    }),
    form = useForm<z.infer<typeof schema>>({
      resolver: zodResolver(schema),
      defaultValues: {
        scheduledAt: "",
        address: "",
        contactPhone: "",
        note: "",
      },
    }),
    save = useMutation({
      mutationFn: (v: z.infer<typeof schema>) =>
        bookingsApi.create(id, {
          ...v,
          scheduledAt: new Date(v.scheduledAt).toISOString(),
        }),
      onSuccess: (b) => {
        void client.invalidateQueries({ queryKey: ["bookings"] });
        navigate(`/bookings/${b.id}`);
      },
    });
  const s = query.data;
  return (
    <AppShell>
      <Link to="/services" className="text-teal">
        ← Dịch vụ
      </Link>
      <QueryState query={query} />
      {s && (
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl p-7">
            <p className="text-teal">{s.category}</p>
            <h1 className="mt-2 text-3xl font-display font-bold">{s.name}</h1>
            <p className="mt-4 whitespace-pre-wrap">{s.description}</p>
            <p className="mt-4 text-muted-foreground">
              {s.district}, {s.city}
            </p>
            <p className="mt-4 text-xl font-semibold">
              Từ {s.priceFrom.toLocaleString("vi-VN")}₫
            </p>
            {s.phone && (
              <Button asChild variant="outline" className="mt-5">
                <a href={`tel:${s.phone}`}>Gọi {s.phone}</a>
              </Button>
            )}
          </Card>
          <Card className="rounded-3xl p-7">
            <h2 className="text-xl font-semibold">Đặt lịch dịch vụ</h2>
            {me ? (
              <form
                className="mt-5 space-y-4"
                onSubmit={form.handleSubmit((v) => save.mutate(v))}
              >
                {(
                  [
                    ["scheduledAt", "Ngày giờ hẹn", "datetime-local"],
                    ["address", "Địa chỉ", "text"],
                    ["contactPhone", "Số điện thoại", "tel"],
                    ["note", "Ghi chú (tùy chọn)", "text"],
                  ] as const
                ).map(([k, l, t]) => (
                  <label key={k} className="block text-sm">
                    {l}
                    <Input type={t} {...form.register(k)} className="mt-2" />
                    {form.formState.errors[k] && (
                      <p role="alert" className="mt-1 text-destructive">
                        {form.formState.errors[k]?.message}
                      </p>
                    )}
                  </label>
                ))}
                <p className="text-xs text-muted-foreground">
                  Lịch hẹn từ 30 phút đến 60 ngày kể từ hiện tại.
                </p>
                {save.isError && (
                  <p role="alert" className="text-destructive">
                    {save.error.message}
                  </p>
                )}
                <Button disabled={save.isPending} type="submit">
                  {save.isPending ? "Đang đặt…" : "Xác nhận đặt lịch"}
                </Button>
              </form>
            ) : (
              <Button asChild className="mt-5">
                <Link to="/login">Đăng nhập để đặt lịch</Link>
              </Button>
            )}
          </Card>
        </div>
      )}
    </AppShell>
  );
}
