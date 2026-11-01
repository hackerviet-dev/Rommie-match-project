import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useStaffPath } from "@/features/auth";
import { staffApi, type StaffUserDetail } from "../services/staff-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmAction } from "@/components/common/confirm-action";

type Step = "delete" | "restore" | "purge";

// Two-step deletion: soft delete first (reversible), then a separate hard delete
// that only appears once the account is already soft deleted.
export function AccountDeletion({ user }: { user: StaffUserDetail }) {
  const staffPath = useStaffPath();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [note, setNote] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [pending, setPending] = useState<Step | null>(null);
  const isDeleted = !!user.deletedAt;
  const isNoteValid = note.trim().length >= 5;
  const isEmailMatched = confirmEmail.trim().toLowerCase() === user.email.toLowerCase();

  const run = useMutation({
    mutationFn: (step: Step) =>
      step === "delete"
        ? staffApi.deleteUser(user.id, note.trim())
        : step === "restore"
          ? staffApi.restoreUser(user.id, note.trim())
          : staffApi.purgeUser(user.id, note.trim(), confirmEmail.trim()),
    onSuccess: (_, step) => {
      setPending(null);
      setNote("");
      setConfirmEmail("");
      if (step === "purge") {
        client.removeQueries({ queryKey: ["staff", "user"] });
        void client.invalidateQueries({ queryKey: ["staff", "users"] });
        toast.success("Đã xóa vĩnh viễn tài khoản và dữ liệu liên quan.");
        navigate(`${staffPath}/users`);
        return;
      }
      void client.invalidateQueries({ queryKey: ["staff"] });
      toast.success(
        step === "delete"
          ? "Đã xóa mềm tài khoản. Phiên đăng nhập đã bị thu hồi."
          : "Đã khôi phục tài khoản.",
      );
    },
    onError: (e) => toast.error(e.message),
  });

  const dialog: Record<Step, { title: string; description: string }> = {
    delete: {
      title: "Xóa mềm tài khoản",
      description: `${user.email} sẽ bị đăng xuất, không đăng nhập được và bị ẩn khỏi tìm kiếm, ghép đôi, chat cùng các tin phòng đang đăng. Dữ liệu vẫn được giữ để có thể khôi phục.`,
    },
    restore: {
      title: "Khôi phục tài khoản",
      description: `${user.email} đăng nhập lại được; các tin phòng bị ẩn cùng lúc xóa mềm sẽ hiện lại.`,
    },
    purge: {
      title: "Xóa vĩnh viễn tài khoản",
      description: `Không thể hoàn tác. Tài khoản ${user.email} cùng hồ sơ, tin phòng, tin nhắn, ghép đôi và lịch sử thanh toán sẽ bị xóa khỏi cơ sở dữ liệu.`,
    },
  };

  return (
    <Card className="rounded-2xl border-red-200 p-6 shadow-none">
      <h2 className="flex items-center gap-2 font-semibold text-red-700">
        <Trash2 className="h-5 w-5" />
        Xóa tài khoản
      </h2>
      {isDeleted ? (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          Đã xóa mềm lúc {new Date(user.deletedAt!).toLocaleString("vi-VN")}. Có thể khôi phục hoặc
          xóa vĩnh viễn.
          {user.deletedBySelf &&
            " Thành viên tự yêu cầu xóa; hệ thống tự xóa vĩnh viễn sau 30 ngày."}
        </p>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          Bước 1 là xóa mềm, có thể khôi phục. Sau đó mới xóa vĩnh viễn được.
        </p>
      )}
      <label className="mt-4 block text-sm">
        Lý do
        <textarea
          className="mt-2 min-h-20 w-full rounded-xl border p-3"
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {note.length > 0 && !isNoteValid && (
          <span className="mt-1 block text-xs text-destructive">Nhập lý do từ 5 ký tự</span>
        )}
      </label>
      {!isDeleted ? (
        <Button
          variant="destructive"
          className="mt-4 w-full"
          disabled={!isNoteValid || run.isPending}
          onClick={() => setPending("delete")}
        >
          Xóa tài khoản (xóa mềm)
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            className="mt-4 w-full"
            disabled={!isNoteValid || run.isPending}
            onClick={() => setPending("restore")}
          >
            Khôi phục tài khoản
          </Button>
          <div className="mt-5 border-t pt-4">
            <label className="block text-sm">
              Nhập lại email để xóa vĩnh viễn
              <Input
                className="mt-2 rounded-xl"
                placeholder={user.email}
                autoComplete="off"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
              />
            </label>
            <Button
              variant="destructive"
              className="mt-3 w-full"
              disabled={!isNoteValid || !isEmailMatched || run.isPending}
              onClick={() => setPending("purge")}
            >
              Xóa vĩnh viễn
            </Button>
          </div>
        </>
      )}
      <ConfirmAction
        open={!!pending}
        onOpenChange={(v) => {
          if (!v) setPending(null);
        }}
        title={pending ? dialog[pending].title : ""}
        description={pending ? dialog[pending].description : ""}
        pending={run.isPending}
        onConfirm={() => pending && run.mutate(pending)}
      />
    </Card>
  );
}
