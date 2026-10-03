import { ChevronRight, MessageCircle, ShieldCheck, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Conversation } from "../types/chat-types";

export function ChatContactPanel({
  conversation,
  isOpen,
  onClose,
}: {
  conversation?: Conversation;
  isOpen: boolean;
  onClose: () => void;
}) {
  const partner = conversation?.partner;
  return (
    <aside
      aria-label="Thông tin người trò chuyện"
      className={`${isOpen ? "absolute inset-y-0 right-0 z-30 w-72 shadow-xl xl:static xl:w-auto xl:shadow-none" : "hidden xl:block"} overflow-y-auto border-l border-border/60 bg-white px-5 py-8`}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Đóng thông tin hội thoại"
        className="absolute right-2 top-2 h-8 w-8 xl:hidden"
        onClick={onClose}
      >
        <X />
      </Button>
      {partner ? (
        <>
          {partner.avatarUrl ? (
            <img
              src={partner.avatarUrl}
              alt={partner.displayName}
              className="mx-auto h-20 w-20 rounded-full bg-mint/25 ring-4 ring-mint/15"
            />
          ) : (
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-mint/25 text-2xl font-semibold">
              {partner.displayName.slice(0, 2)}
            </div>
          )}
          <h2 className="mt-4 text-center font-semibold">
            {partner.displayName}
          </h2>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Người bạn đang trò chuyện
          </p>
          {partner.isVerified && (
            <p className="mt-2 flex items-center justify-center gap-1 text-xs text-teal">
              <ShieldCheck className="h-3 w-3" />
              Đã xác minh
            </p>
          )}
          <Button asChild variant="outline" className="mt-5 w-full rounded-xl">
            <Link to={`/profile/${partner.userId}`}>
              Xem hồ sơ
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </>
      ) : (
        <div className="text-center">
          <MessageCircle className="mx-auto h-12 w-12 rounded-2xl bg-mint/20 p-3 text-teal" />
          <h2 className="mt-4 font-semibold">Kết nối và tìm hiểu</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Thông tin người trò chuyện sẽ xuất hiện khi bạn chọn một hội thoại.
          </p>
        </div>
      )}
      <div className="mt-7 rounded-2xl bg-mint/15 p-4">
        <h3 className="text-sm font-semibold">Gợi ý mở lời</h3>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Hỏi về khu vực muốn ở, ngân sách và thói quen sinh hoạt để hiểu nhau
          hơn.
        </p>
      </div>
      <div className="mt-5 border-t pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          An toàn khi kết nối
        </h3>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Bảo vệ thông tin cá nhân và xác minh phòng trước khi đặt cọc.
        </p>
        <Button
          asChild
          variant="link"
          className="mt-3 h-auto p-0 text-xs text-teal"
        >
          <Link to="/community-guidelines">
            <ShieldCheck className="mr-1 h-4 w-4" />
            Quy tắc cộng đồng
            <ChevronRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>
    </aside>
  );
}
