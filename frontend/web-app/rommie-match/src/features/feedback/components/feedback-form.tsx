import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FEEDBACK_CATEGORIES,
  feedbackApi,
  type FeedbackCategory,
} from "../services/feedback-api";

type FeedbackFormProps = {
  onSent?: () => void;
};

const MIN_LENGTH = 5;
const MAX_LENGTH = 2000;

// Member-facing form; what is sent here shows up in the staff "Góp ý người dùng" queue.
export function FeedbackForm({ onSent }: FeedbackFormProps) {
  const [category, setCategory] = useState<FeedbackCategory>("suggestion"),
    [rating, setRating] = useState<number | null>(null),
    [message, setMessage] = useState(""),
    send = useMutation({
      mutationFn: () =>
        feedbackApi.create({
          category,
          rating,
          message: message.trim(),
          pagePath: window.location.pathname,
        }),
      onSuccess: () => {
        setMessage("");
        setRating(null);
        toast.success("Cảm ơn bạn! Góp ý đã được gửi tới đội ngũ RoomieMatch.");
        onSent?.();
      },
    });
  const isTooShort = message.trim().length < MIN_LENGTH;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isTooShort) send.mutate();
  }

  return (
    <form className="min-w-0" onSubmit={handleSubmit}>
      <div
        role="radiogroup"
        aria-label="Loại góp ý"
        className="flex flex-wrap gap-2"
      >
        {(Object.keys(FEEDBACK_CATEGORIES) as FeedbackCategory[]).map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={category === key}
            onClick={() => setCategory(key)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${category === key ? "border-navy bg-navy text-white" : "bg-white hover:bg-muted"}`}
          >
            {FEEDBACK_CATEGORIES[key]}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Mức hài lòng</span>
        <div role="radiogroup" aria-label="Mức hài lòng" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} sao`}
              onClick={() => setRating(rating === n ? null : n)}
              className="rounded p-0.5"
            >
              <Star
                className={`h-5 w-5 ${rating !== null && n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
              />
            </button>
          ))}
        </div>
      </div>
      <Textarea
        aria-label="Nội dung góp ý"
        className="mt-4 min-h-28"
        maxLength={MAX_LENGTH}
        placeholder="Bạn muốn RoomieMatch cải thiện điều gì?"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {message.length}/{MAX_LENGTH}
        </span>
        <Button type="submit" disabled={isTooShort || send.isPending}>
          {send.isPending ? "Đang gửi…" : "Gửi góp ý"}
        </Button>
      </div>
      {send.isError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {send.error.message}
        </p>
      )}
    </form>
  );
}
