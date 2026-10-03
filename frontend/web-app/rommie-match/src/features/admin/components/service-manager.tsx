import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hyperlocalApi } from "@/features/hyperlocal";
import type { LocalService } from "@/features/hyperlocal/types/hyperlocal-types";
import { serviceSchema, type ServiceForm } from "../schemas/service-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { QueryState, Pagination } from "@/components/common/query-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function ServiceManager() {
  const [page, setPage] = useState(1),
    [city, setCity] = useState("TP.HCM"),
    [edit, setEdit] = useState<LocalService | null | undefined>(undefined),
    [deleteId, setDeleteId] = useState<string | null>(null),
    client = useQueryClient(),
    query = useQuery({
      queryKey: ["services", "admin", city, page],
      queryFn: () => hyperlocalApi.list(city, undefined, undefined, page),
    }),
    remove = useMutation({
      mutationFn: hyperlocalApi.remove,
      onSuccess: () => {
        setDeleteId(null);
        void client.invalidateQueries({ queryKey: ["services"] });
      },
    });
  return (
    <Card className="rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Quản lý dịch vụ</h2>
        <Button onClick={() => setEdit(null)}>Thêm dịch vụ</Button>
      </div>
      <label className="mt-4 block text-sm">
        Thành phố
        <Input
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setPage(1);
          }}
        />
      </label>
      <QueryState query={query} />
      {query.data?.items.map((s) => (
        <div
          key={s.id}
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
        >
          <div>
            <strong>{s.name}</strong>
            <p className="text-xs text-muted-foreground">
              {s.city} · {s.category}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEdit(s)}>
              Sửa
            </Button>
            <Button variant="destructive" onClick={() => setDeleteId(s.id)}>
              Xóa
            </Button>
          </div>
        </div>
      ))}
      {query.data && (
        <Pagination
          page={page}
          hasNext={query.data.hasNextPage}
          onChange={setPage}
        />
      )}
      <Dialog
        open={edit !== undefined}
        onOpenChange={(o) => {
          if (!o) setEdit(undefined);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit ? "Sửa dịch vụ" : "Thêm dịch vụ"}</DialogTitle>
            <DialogDescription>
              Thông tin hiển thị trên danh sách dịch vụ.
            </DialogDescription>
          </DialogHeader>
          {edit !== undefined && (
            <ServiceEditor
              key={edit?.id ?? "new"}
              service={edit}
              onSaved={() => setEdit(undefined)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa dịch vụ?</DialogTitle>
            <DialogDescription>
              Dịch vụ sẽ không còn hiển thị cho thành viên.
            </DialogDescription>
          </DialogHeader>
          {remove.isError && (
            <p className="text-destructive">{remove.error.message}</p>
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
    </Card>
  );
}
function ServiceEditor({
  service,
  onSaved,
}: {
  service: LocalService | null;
  onSaved: () => void;
}) {
  const client = useQueryClient(),
    form = useForm<ServiceForm>({
      resolver: zodResolver(serviceSchema),
      defaultValues: {
        name: service?.name ?? "",
        category: service?.category ?? "",
        city: service?.city ?? "",
        district: service?.district ?? "",
        description: service?.description ?? "",
        phone: service?.phone ?? "",
        priceFrom: service?.priceFrom ?? 0,
        distanceKm: service?.distanceKm ?? 0,
        rating: service?.rating ?? 0,
        reviewCount: service?.reviewCount ?? 0,
        isVerified: service?.isVerified ?? false,
      },
    }),
    save = useMutation({
      mutationFn: (v: ServiceForm) =>
        service ? hyperlocalApi.update(service.id, v) : hyperlocalApi.create(v),
      onSuccess: () => {
        void client.invalidateQueries({ queryKey: ["services"] });
        onSaved();
      },
    });
  return (
    <form
      onSubmit={form.handleSubmit((v) => save.mutate(v))}
      className="space-y-3"
    >
      {(
        [
          ["name", "Tên dịch vụ", "text"],
          ["category", "Danh mục", "text"],
          ["city", "Thành phố", "text"],
          ["district", "Quận / khu vực", "text"],
          ["description", "Mô tả", "text"],
          ["phone", "Điện thoại", "tel"],
          ["priceFrom", "Giá từ (VND)", "number"],
          ["distanceKm", "Khoảng cách (km)", "number"],
          ["rating", "Đánh giá (0–5)", "number"],
          ["reviewCount", "Số đánh giá", "number"],
        ] as const
      ).map(([k, l, t]) => (
        <label key={k} className="block text-sm">
          {l}
          <Input
            type={t}
            step={t === "number" ? "any" : undefined}
            {...form.register(k)}
          />
          {form.formState.errors[k] && (
            <p className="text-destructive">
              {form.formState.errors[k]?.message}
            </p>
          )}
        </label>
      ))}
      <label className="flex gap-2">
        <input type="checkbox" {...form.register("isVerified")} />
        Đã xác minh
      </label>
      {save.isError && (
        <p role="alert" className="text-destructive">
          {save.error.message}
        </p>
      )}
      <Button disabled={save.isPending} type="submit">
        Lưu dịch vụ
      </Button>
    </form>
  );
}
