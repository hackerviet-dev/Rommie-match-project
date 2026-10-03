import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { UsersRound, Mail, Plus } from "lucide-react";
import { workspaceApi } from "../services/workspace-api";
import { groupSchema, inviteSchema } from "../schemas/workspace-schemas";
import { useAuthStore } from "@/features/auth";
import { roomsApi } from "@/features/rooms";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryState, Pagination } from "@/components/common/query-state";
import { ConfirmAction } from "@/components/common/confirm-action";
import { groupRoleLabel } from "../utils/workspace-labels";
export function GroupsPanel({ staff = false }: { staff?: boolean }) {
  const [params, setParams] = useSearchParams(),
    id = params.get("group") ?? "",
    [page, setPage] = useState(1),
    me = useAuthStore((s) => s.user),
    client = useQueryClient();
  const query = useQuery({
    queryKey: ["groups", staff, me?.id, page],
    queryFn: () => workspaceApi.groups(staff, page),
  });
  const ownRooms = useQuery({
    queryKey: ["rooms", "mine", me?.id],
    queryFn: roomsApi.mine,
    enabled: !staff,
  });
  const detail = useQuery({
    queryKey: ["groups", "detail", staff, me?.id, id],
    queryFn: () => workspaceApi.group(id, staff),
    enabled: !!id,
  });
  const form = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: "", roomId: "" },
  });
  const invite = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  });
  const update = () => {
    void client.invalidateQueries({ queryKey: ["groups"] });
  };
  const create = useMutation({
    mutationFn: (v: z.infer<typeof groupSchema>) =>
      workspaceApi.createGroup({ ...v, roomId: v.roomId || undefined }),
    onSuccess: (r) => {
      update();
      form.reset();
      setParams({ group: r.id });
      toast.success("Đã tạo nhóm ở ghép.");
    },
    onError: (e) => toast.error(e.message),
  });
  const inviting = useMutation({
    mutationFn: (v: z.infer<typeof inviteSchema>) =>
      workspaceApi.invite(id, v.email),
    onSuccess: () => {
      update();
      invite.reset();
      toast.success("Đã gửi lời mời trong ứng dụng.");
    },
    onError: (e) => toast.error(e.message),
  });
  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      workspaceApi.respond(id, accept),
    onSuccess: update,
    onError: (e) => toast.error(e.message),
  });
  const [action, setAction] = useState<{
    userId: string;
    name: string;
    role: string | null;
  } | null>(null);
  const roleChange = useMutation({
    mutationFn: () =>
      action?.role
        ? workspaceApi.role(id, action.userId, action.role, staff)
        : workspaceApi.remove(id, action!.userId),
    onSuccess: () => {
      update();
      setAction(null);
      toast.success("Đã cập nhật thành viên nhóm.");
    },
    onError: (e) => toast.error(e.message),
  });
  const leave = useMutation({
    mutationFn: () => workspaceApi.leave(id),
    onSuccess: () => {
      update();
      setParams({});
      setLeaving(false);
      toast.success("Đã rời nhóm.");
    },
    onError: (e) => toast.error(e.message),
  });
  const [leaving, setLeaving] = useState(false);
  const myRole = detail.data?.members.find(
    (m) => m.userId === me?.id && m.status === "active",
  )?.role;
  const canManage = staff ? me?.role === "admin" : myRole === "owner";
  return (
    <div>
      <h1 className="text-2xl font-display font-bold">Nhóm ở ghép</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Quyền trong nhóm tách biệt với quyền admin/moderator của hệ thống.
      </p>
      {!staff && (
        <Card className="mt-6 rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Plus className="h-4 w-4" />
            Tạo nhóm của bạn
          </h2>
          <form
            onSubmit={form.handleSubmit((v) => create.mutate(v))}
            className="mt-4 flex flex-wrap items-start gap-3"
          >
            <div className="min-w-48 flex-1">
              <Input
                aria-label="Tên nhóm"
                placeholder="Tên nhóm ở ghép"
                maxLength={160}
                {...form.register("name")}
              />
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.name?.message}
              </p>
            </div>
            <select
              aria-label="Phòng của nhóm"
              className="rounded-xl border bg-white px-3 py-3 text-sm"
              {...form.register("roomId")}
            >
              <option value="">Chưa gắn với phòng</option>
              {ownRooms.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
            <Button disabled={create.isPending}>Tạo nhóm</Button>
          </form>
        </Card>
      )}
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="min-w-0">
          <QueryState query={query} />
          <div className="space-y-3">
            {query.data?.items.map((g) => (
              <Card
                key={g.id}
                className={`rounded-2xl p-4 ${g.id === id ? "border-indigo-300 bg-indigo-50/30" : ""}`}
              >
                <button
                  className="w-full text-left"
                  disabled={g.myStatus === "invited"}
                  onClick={() => setParams({ group: g.id })}
                >
                  <h2 className="flex items-center gap-2 font-semibold">
                    <UsersRound className="h-4 w-4" />
                    {g.name}
                  </h2>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {g.memberCount} thành viên
                    {g.myRole ? ` · ${groupRoleLabel(g.myRole)}` : ""}
                  </p>
                </button>
                {g.myStatus === "invited" && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs text-teal">
                      Bạn có lời mời tham gia nhóm
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={respond.isPending}
                        onClick={() =>
                          respond.mutate({ id: g.id, accept: true })
                        }
                      >
                        Tham gia
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={respond.isPending}
                        onClick={() =>
                          respond.mutate({ id: g.id, accept: false })
                        }
                      >
                        Từ chối
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
          {query.data?.totalCount === 0 && (
            <Card className="rounded-2xl p-6 text-sm text-muted-foreground">
              {staff ? "Chưa có nhóm ở ghép trong hệ thống." : "Chưa có nhóm hoặc lời mời."}
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
        <div className="min-w-0">
          {id && <QueryState query={detail} />}
          {!id && (
            <Card className="flex min-h-64 flex-col items-center justify-center rounded-2xl p-6 text-center">
              <div className="mb-4 rounded-2xl bg-indigo-50 p-4 text-indigo-500">
                <UsersRound className="h-8 w-8" aria-hidden="true" />
              </div>
              <h2 className="font-semibold">Thành viên trong nhóm</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {query.data?.totalCount === 0
                  ? "Thông tin thành viên và quyền sẽ hiển thị khi có nhóm ở ghép."
                  : "Chọn một nhóm trong danh sách để xem thành viên và phân quyền."}
              </p>
            </Card>
          )}
          {detail.data && !detail.isError && (
            <Card className="rounded-2xl p-6">
              <h2 className="text-xl font-semibold">{detail.data.name}</h2>
              {!staff && myRole && myRole !== "owner" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setLeaving(true)}
                >
                  Rời nhóm
                </Button>
              )}
              {detail.data.roomId && (
                <Link
                  to={
                    staff
                      ? `/admin/rooms?room=${detail.data.roomId}`
                      : `/rooms/${detail.data.roomId}`
                  }
                  className="mt-2 inline-block text-sm text-teal"
                >
                  Xem phòng liên quan →
                </Link>
              )}
              {!staff && (myRole === "owner" || myRole === "manager") && (
                <form
                  className="my-5 flex flex-wrap items-start gap-2 rounded-xl bg-muted/40 p-4"
                  onSubmit={invite.handleSubmit((v) => inviting.mutate(v))}
                >
                  <div className="flex-1">
                    <Input
                      aria-label="Email thành viên được mời"
                      placeholder="Email tài khoản cần mời"
                      {...invite.register("email")}
                    />
                    <p className="mt-1 text-xs text-destructive">
                      {invite.formState.errors.email?.message}
                    </p>
                  </div>
                  <Button disabled={inviting.isPending}>
                    <Mail className="h-4 w-4" />
                    Mời vào nhóm
                  </Button>
                </form>
              )}
              <div className="mt-5 divide-y">
                {detail.data.members.map((m) => (
                  <div
                    key={m.userId}
                    className="flex flex-wrap items-center gap-3 py-4"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint/30">
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt=""
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        m.displayName?.slice(0, 1)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={
                          staff
                            ? `/admin/users/${m.userId}`
                            : `/profile/${m.userId}`
                        }
                        className="font-medium"
                      >
                        {m.displayName}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {groupRoleLabel(m.role)} ·{" "}
                        {m.status === "active"
                          ? "Đã tham gia"
                          : "Chờ chấp nhận lời mời"}
                      </p>
                    </div>
                    {canManage &&
                      m.role !== "owner" &&
                      m.status === "active" && (
                        <select
                          aria-label={`Vai trò của ${m.displayName}`}
                          value={m.role}
                          onChange={(e) =>
                            setAction({
                              userId: m.userId,
                              name: m.displayName,
                              role: e.target.value,
                            })
                          }
                          className="rounded-lg border bg-white p-2 text-xs"
                        >
                          <option value="member">Thành viên</option>
                          <option value="manager">Người quản lý</option>
                          <option value="owner">Chuyển quyền chủ nhóm</option>
                        </select>
                      )}
                    {canManage && !staff && m.role !== "owner" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setAction({
                            userId: m.userId,
                            name: m.displayName,
                            role: null,
                          })
                        }
                      >
                        {m.status === "invited"
                          ? "Hủy lời mời"
                          : "Xóa khỏi nhóm"}
                      </Button>
                    )}
                    {!staff && m.userId !== me?.id && m.status === "active" && (
                      <Link
                        to={`/disputes?respondent=${m.userId}&group=${id}`}
                        className="text-xs text-teal"
                      >
                        Yêu cầu hòa giải
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
      <ConfirmAction
        open={leaving}
        onOpenChange={setLeaving}
        title="Rời nhóm ở ghép"
        description="Bạn sẽ không còn xem được thông tin nhóm. Muốn tham gia lại, bạn cần nhận lời mời mới."
        pending={leave.isPending}
        onConfirm={() => leave.mutate()}
      />
      <ConfirmAction
        open={!!action}
        onOpenChange={(v) => {
          if (!v) setAction(null);
        }}
        title="Cập nhật quyền trong nhóm"
        description={
          action
            ? `${action.name}: ${action.role ? groupRoleLabel(action.role) : "Xóa khỏi nhóm"}.${action.role === "owner" ? " Chủ nhóm hiện tại sẽ trở thành người quản lý." : ""}`
            : ""
        }
        pending={roleChange.isPending}
        onConfirm={() => roleChange.mutate()}
      />
    </div>
  );
}
