import { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import mascotAvatar from "@/assets/mascot-frame-middle.png";
import mascotFrame1 from "@/assets/mascot-frame-1.png";
import mascotFrame2 from "@/assets/mascot-frame-2.png";
import mascotFrame3 from "@/assets/mascot-frame-3.png";
import mascotFrame4 from "@/assets/mascot-frame-4.png";
import mascotFrame5 from "@/assets/mascot-frame-5.png";
import mascotFrame6 from "@/assets/mascot-frame-6.png";
import mascotFrame7 from "@/assets/mascot-frame-7.png";

const MASCOT_FRAMES = [
  mascotFrame1,
  mascotFrame2,
  mascotFrame3,
  mascotFrame4,
  mascotFrame5,
  mascotFrame6,
  mascotFrame7,
];

// Play the greeting forwards and backwards so it does not snap from the last
// frame to the first. The short pause keeps it lively without being distracting.
const MASCOT_GREETING_SEQUENCE = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];

function AnimatedMascot({ className = "" }: { className?: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    MASCOT_FRAMES.forEach((src) => { const img = new Image(); img.src = src; });
  }, []);

  useEffect(() => {
    const isLastStep = step === MASCOT_GREETING_SEQUENCE.length - 1;
    const timer = window.setTimeout(() => {
      setStep((current) => (current + 1) % MASCOT_GREETING_SEQUENCE.length);
    }, isLastStep ? 2400 : 150);

    return () => window.clearTimeout(timer);
  }, [step]);

  // Keep the small illustrated greeting visible even when the operating system
  // reduces motion; the larger bob and halo effects remain disabled via CSS.
  const frame = MASCOT_GREETING_SEQUENCE[step];

  return (
    <span className={`relative block overflow-hidden rounded-full ${className}`} data-mascot-frame={frame}>
      <span className="mascot-halo absolute inset-0 rounded-full bg-teal/20" aria-hidden="true" />
      <img
        src={MASCOT_FRAMES[frame]}
        alt=""
        className="mascot-bob absolute inset-[4%] h-[92%] w-[92%] object-contain"
      />
    </span>
  );
}

export function AIChatbox() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  const close = () => { setOpen(false); triggerRef.current?.focus(); };

  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 lg:bottom-5 lg:right-5 z-40">
      <style>{`
        @keyframes mascot-bob {
          0%, 100% { transform: translateY(1px) scale(.96); }
          50% { transform: translateY(-3px) scale(1); }
        }
        @keyframes mascot-halo {
          0%, 100% { opacity: .2; transform: scale(.72); }
          50% { opacity: .65; transform: scale(1); }
        }
        .mascot-bob {
          animation: mascot-bob 1.8s ease-in-out infinite;
          transform-origin: center;
        }
        .mascot-halo {
          animation: mascot-halo 1.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .mascot-bob, .mascot-halo { animation: none; }
        }
      `}</style>
      {open && (
        <div id="roomiematch-assistant" role="dialog" aria-label="Trợ lý RoomieMatch" onKeyDown={(e) => { if (e.key === "Escape") close(); }} className="mb-3 w-[340px] max-w-[calc(100vw-1.5rem)] h-[460px] max-h-[calc(100dvh-12rem)] md:max-h-[calc(100dvh-8rem)] rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4">
          <div className="px-4 py-3 gradient-brand text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-white/20 grid place-items-center overflow-visible">
                <img src={mascotAvatar} alt="Mascot RoomieMatch" className="h-10 w-10 object-contain" />
              </div>
              <div>
                <div className="font-display font-bold text-sm">Trợ lý RoomieMatch</div>
                <div className="text-[11px] opacity-90">Chưa kết nối AI</div>
              </div>
            </div>
            <button ref={closeRef} aria-label="Đóng trợ lý" onClick={close} className="hover:bg-white/10 rounded-lg p-1"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-muted/20">
            <p role="status" className="rounded-2xl border bg-card p-3 text-sm">Trợ lý AI chưa được kết nối. Hiện chưa thể gửi câu hỏi hoặc nhận câu trả lời.</p>
            <p className="text-sm text-muted-foreground">Bạn có thể truy cập:</p>
            <div className="space-y-2">
              {[{ to: "/settings?section=profile", label: "Hồ sơ của tôi" }, { to: "/premium", label: "Gói và thanh toán" }, { to: "/community-guidelines", label: "Quy tắc cộng đồng" }].map((item) => <Link key={item.to} to={item.to} onClick={close} className="block rounded-xl border bg-card px-3 py-2 text-sm hover:bg-mint/30">{item.label}</Link>)}
            </div>
          </div>
          <div className="p-2 border-t flex gap-2 bg-card">
            <input aria-label="Câu hỏi cho trợ lý" disabled placeholder="AI chưa được kết nối" className="min-w-0 flex-1 h-10 rounded-xl border bg-muted px-3 text-sm" />
            <Button aria-label="Gửi câu hỏi" disabled size="icon" className="h-10 w-10 shrink-0 rounded-xl bg-teal"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
        aria-expanded={open}
        aria-controls="roomiematch-assistant"
        className="relative h-20 w-20 rounded-full bg-white/85 shadow-xl shadow-teal/25 grid place-items-center hover:scale-105 transition-transform border border-mint/40"
      >
        <AnimatedMascot className="h-full w-full" />
        {open && (
          <span className="absolute -right-1 -top-1 h-7 w-7 rounded-full bg-navy text-white grid place-items-center shadow-md">
            <X className="h-4 w-4" />
          </span>
        )}
      </button>
    </div>
  );
}
