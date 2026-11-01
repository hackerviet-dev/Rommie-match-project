import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmAction } from "@/components/common/confirm-action";
import { useAuthStore, useDeleteAccount } from "@/features/auth";

export function DeleteAccountCard() {
  const email = useAuthStore((state) => state.user?.email ?? "");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const deleteAccount = useDeleteAccount();
  const isEmailMatched = confirmEmail.trim().toLowerCase() === email.toLowerCase();

  function handleConfirm() {
    deleteAccount.mutate(
      { confirmEmail: confirmEmail.trim(), password: password || null },
      { onError: () => setIsConfirmOpen(false) },
    );
  }

  return (
    <Card className="p-6 rounded-3xl border border-destructive/20 shadow-sm lg:col-span-2">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-destructive/10 grid place-items-center text-destructive shrink-0">
          <Trash2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-bold">Xóa tài khoản</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tài khoản bị đăng xuất khỏi mọi thiết bị, hồ sơ và tin phòng bị ẩn ngay. Sau 30 ngày,
            tài khoản cùng hồ sơ, tin phòng, tin nhắn, ghép đôi và lịch sử thanh toán bị xóa vĩnh
            viễn. Trong 30 ngày đó bạn có thể nhờ đội ngũ hỗ trợ khôi phục.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Nhập lại email của bạn
              <Input
                className="mt-2 rounded-xl"
                type="email"
                autoComplete="off"
                placeholder={email}
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Mật khẩu hiện tại
              <Input
                className="mt-2 rounded-xl"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Bỏ trống nếu bạn chỉ đăng nhập bằng Google.
              </span>
            </label>
          </div>
          {deleteAccount.error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {deleteAccount.error.message}
            </p>
          )}
          <Button
            variant="destructive"
            className="mt-5 rounded-xl"
            disabled={!isEmailMatched || deleteAccount.isPending}
            onClick={() => setIsConfirmOpen(true)}
          >
            Xóa tài khoản của tôi
          </Button>
        </div>
      </div>
      <ConfirmAction
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Xóa tài khoản RoomieMatch?"
        description="Bạn sẽ bị đăng xuất ngay và không đăng nhập lại được. Dữ liệu bị xóa vĩnh viễn sau 30 ngày."
        pending={deleteAccount.isPending}
        onConfirm={handleConfirm}
      />
    </Card>
  );
}
