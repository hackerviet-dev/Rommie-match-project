import { MessageSquareHeart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackForm } from "./feedback-form";

type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Opened from the "Góp ý" button in the app header so members can send feedback from any page.
export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto rounded-3xl">
        <DialogHeader className="flex-row items-start gap-3 space-y-0 text-left">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint/30 text-navy">
            <MessageSquareHeart className="h-5 w-5" />
          </div>
          <div className="pr-6">
            <DialogTitle className="font-display font-bold">
              Góp ý cho RoomieMatch
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              Báo lỗi, đề xuất tính năng hoặc chia sẻ trải nghiệm của bạn. Đội
              ngũ kiểm duyệt sẽ đọc mọi góp ý.
            </DialogDescription>
          </div>
        </DialogHeader>
        <FeedbackForm onSent={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
