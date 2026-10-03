import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Search, ShieldCheck } from "lucide-react";
import { staffApi } from "../services/staff-api";
import { useAuthStore } from "@/features/auth";
import { accessSchema } from "../schemas/access-schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryState, Pagination } from "@/components/common/query-state";
import { ConfirmAction } from "@/components/common/confirm-action";
export function StaffUsers({ team = false }: { team?: boolean }) {
  const [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [role, setRole] = useState(team ? "staff" : ""),
    me = useAuthStore((s) => s.user?.id);
  const query = useQuery({
    queryKey: ["staff", "users", me, q, role, page],
    queryFn: () => staffApi.users(q, role, page),
  });
  return (
    <div>
      <h1 className="text-2xl font-display font-bold">
        {team ? "Đội ngũ & phân quyền" : "Quản lý thành viên"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {team
          ? "Admin quản lý quyền hệ thống. Moderator kiểm duyệt nội dung và xử lý vụ việc."
          : "Tra cứu tài khoản, hồ sơ và các thông tin cần thiết cho việc kiểm duyệt."}
      </p>
      <Card className="mt-6 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-none">
        <div className="flex flex-wrap gap-3 border-b p-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              aria-label="Tìm thành viên"
              placeholder="Tìm theo tên hoặc email"
              className="rounded-xl pl-10"
              value={q}
              maxLength={100}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label="Lọc vai trò hệ thống"
            className="rounded-xl border bg-white p-3 text-sm"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value={team ? "staff" : ""}>
              {team ? "Đội ngũ quản trị" : "Tất cả vai trò"}
            </option>
            {!team && <option value="member">Thành viên</option>}
            <option value="moderator">Kiểm duyệt viên</option>
            <option value="admin">Quản trị viên</option>
          </select>
        </div>
        <QueryState query={query} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                {["Thành viên", "Vai trò", "Gói", "Trạng thái", "Hồ sơ"].map(
                  (h) => (
                    <th key={h} className="whitespace-nowrap p-4 font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {query.data?.items.map((u) => (
                <tr key={u.id} className="border-t hover:bg-slate-50/60">
                  <td className="p-4">
                    <div className="font-medium">{u.displayName}</div>
                    <div className="mt-1 text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="p-4">
                    {u.role === "admin"
                      ? "Admin"
                      : u.role === "moderator"
                        ? "Moderator"
                        : "Member"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${u.isPremium ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}
                    >
                      {u.isPremium ? "Premium" : "Miễn phí"}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${u.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
                    >
                      {u.isActive ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </td>
                  <td className="p-4">
                    <Link
                      to={`/admin/users/${u.id}`}
                      className="whitespace-nowrap text-indigo-600 hover:underline"
                    >
                      Xem chi tiết →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {query.data?.totalCount === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            Không có tài khoản phù hợp.
          </p>
        )}
      </Card>
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
export function StaffUserDetail() {
  const { id = "" } = useParams(),
    me = useAuthStore((s) => s.user),
    client = useQueryClient();
  const query = useQuery({
    queryKey: ["staff", "user", me?.id, id],
    queryFn: () => staffApi.user(id),
  });
  const form = useForm<z.infer<typeof accessSchema>>({
    resolver: zodResolver(accessSchema),
    values: {
      role: (query.data?.role as "member" | "admin" | "moderator") ?? "member",
      isActive: query.data?.isActive ?? true,
      note: "",
    },
  });
  const [pending, setPending] = useState<z.infer<typeof accessSchema> | null>(
    null,
  );
  const save = useMutation({
    mutationFn: () => staffApi.access(id, pending!),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["staff"] });
      setPending(null);
      toast.success(
        "Đã cập nhật quyền/trạng thái. Phiên cũ của tài khoản đã được thu hồi.",
      );
    },
    onError: (e) => toast.error(e.message),
  });
  const p = query.data?.profile;
  return (
    <div>
      <Link to="/admin/users" className="text-sm text-indigo-600">
        ← Danh sách thành viên
      </Link>
      <h1 className="mt-4 text-2xl font-display font-bold">
        Thông tin thành viên
      </h1>
      <QueryState query={query} />
      {query.data && (
        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="rounded-2xl border-slate-200 p-6 shadow-none">
            <h2 className="text-xl font-semibold">
              {p?.display_name ?? query.data.email}
            </h2>
            <p className="mt-2 text-sm text-slate-500">{query.data.email}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ["Vai trò hệ thống", query.data.role],
                [
                  "Tài khoản",
                  query.data.isActive ? "Đang hoạt động" : "Đã khóa",
                ],
                [
                  "Gói thành viên",
                  query.data.isPremium ? "Premium" : "Miễn phí",
                ],
                [
                  "Ngày tham gia",
                  new Date(query.data.createdAt).toLocaleDateString("vi-VN"),
                ],
                ["Công việc", p?.occupation],
                ["Khu vực", [p?.district, p?.city].filter(Boolean).join(" · ")],
                ["Trường học / đơn vị", p?.organization_name],
                [
                  "Hiển thị đơn vị",
                  p?.hide_organization
                    ? "Ẩn trên hồ sơ công khai"
                    : "Công khai",
                ],
                ["Xác minh", p?.is_verified ? "Đã xác minh" : "Chưa xác minh"],
                ["Hoàn thiện hồ sơ", p ? `${p.profile_completion}%` : null],
                [
                  "Giới tính",
                  { male: "Nam", female: "Nữ", other: "Khác" }[
                    p?.gender ?? ""
                  ] ?? "Chưa cập nhật",
                ],
                ["Năm sinh", p?.birth_year],
                ["Tin phòng đã đăng", query.data.roomCount],
                ["Báo cáo liên quan", query.data.reportCount],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-2 break-words text-sm font-medium">
                    {value ?? "Chưa cập nhật"}
                  </p>
                </div>
              ))}
            </div>
            <h3 className="mt-6 font-semibold">Giới thiệu</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
              {p?.bio || "Chưa có giới thiệu."}
            </p>
            {query.data.lifestyle && (
              <>
                <h3 className="mt-6 font-semibold">Lối sống đã cung cấp</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Giờ ngủ", "sleep_schedule"],
                    ["Mức sạch sẽ", "cleanliness"],
                    ["Hút thuốc", "smoking"],
                    ["Thú cưng", "pet_friendly"],
                    ["Rượu bia", "drinking"],
                    ["Môi trường phòng", "room_environment"],
                    ["Phong cách xã hội", "social_style"],
                    ["Hướng ngoại", "extroversion"],
                    ["Khoảng cách mong muốn", "preferred_distance"],
                    ["Loại phòng mong muốn", "preferred_room_type"],
                    ["Ngày dọn vào", "move_in_date"],
                    ["Ngân sách từ", "budget_min"],
                    ["Ngân sách đến", "budget_max"],
                  ].map(([label, key]) => (
                    <p key={key} className="rounded-xl bg-slate-50 p-3 text-sm">
                      <span className="text-slate-500">{label}: </span>
                      {query.data!.lifestyle?.[key] == null
                        ? "Chưa cập nhật"
                        : typeof query.data!.lifestyle?.[key] === "boolean"
                          ? query.data!.lifestyle?.[key]
                            ? "Có"
                            : "Không"
                          : String(query.data!.lifestyle?.[key])}
                    </p>
                  ))}
                </div>
              </>
            )}
          </Card>
          <Card className="rounded-2xl border-slate-200 p-6 shadow-none">
            <h2 className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-5 w-5 text-indigo-500" />
              Quyền & trạng thái
            </h2>
            {me?.role !== "admin" ? (
              <p className="mt-4 text-sm text-slate-500">
                Chỉ Admin được thay đổi quyền hệ thống và khóa/mở tài khoản.
              </p>
            ) : id === me.id ? (
              <p className="mt-4 text-sm text-slate-500">
                Bạn đang xem tài khoản của mình. Không thể tự thay đổi quyền
                hoặc tự khóa phiên đang sử dụng.
              </p>
            ) : (
              <form
                className="mt-5 space-y-4"
                onSubmit={form.handleSubmit(setPending)}
              >
                <label className="block text-sm">
                  Vai trò
                  <select
                    className="mt-2 w-full rounded-xl border bg-white p-3"
                    {...form.register("role")}
                  >
                    <option value="member">Member</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...form.register("isActive")} />
                  Tài khoản hoạt động
                </label>
                <label className="block text-sm">
                  Lý do thay đổi
                  <textarea
                    className="mt-2 min-h-24 w-full rounded-xl border p-3"
                    maxLength={2000}
                    {...form.register("note")}
                  />
                  <p className="mt-1 text-xs text-destructive">
                    {form.formState.errors.note?.message}
                  </p>
                </label>
                <Button className="w-full" disabled={save.isPending}>
                  Kiểm tra thay đổi
                </Button>
              </form>
            )}
          </Card>
        </div>
      )}
      <ConfirmAction
        open={!!pending}
        onOpenChange={(v) => {
          if (!v) setPending(null);
        }}
        title="Xác nhận thay đổi tài khoản"
        description={
          pending
            ? `${query.data?.email}: vai trò ${pending.role}, ${pending.isActive ? "hoạt động" : "khóa tài khoản"}. Tài khoản phải đăng nhập lại; phiên hiện có sẽ bị thu hồi.`
            : ""
        }
        pending={save.isPending}
        onConfirm={() => save.mutate()}
      />
    </div>
  );
}
