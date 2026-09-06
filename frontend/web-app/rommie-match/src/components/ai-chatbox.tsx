import { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "motion/react";
import mascotAvatar from "@/assets/mascot-frame-middle.png";
import mascotFrame1 from "@/assets/mascot-frame-1.png";
import mascotFrame2 from "@/assets/mascot-frame-2.png";
import mascotFrame3 from "@/assets/mascot-frame-3.png";
import mascotFrame4 from "@/assets/mascot-frame-4.png";
import mascotFrame5 from "@/assets/mascot-frame-5.png";
import mascotFrame6 from "@/assets/mascot-frame-6.png";
import mascotFrame7 from "@/assets/mascot-frame-7.png";

type Msg = { role: "user" | "bot"; text: string };

const SUGGESTIONS = [
  "Làm sao để tăng điểm ghép đôi?",
  "Cách báo cáo người dùng?",
  "Phí dịch vụ Premium?",
  "Mẹo viết hồ sơ thu hút",
];

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

function reply(q: string): string {
  const s = q.toLowerCase();
  if (s.includes("ghép") || s.includes("match")) return "Để tăng điểm ghép đôi: hoàn thành 100% hồ sơ, làm trắc nghiệm 5 phút, và cập nhật sở thích lối sống thường xuyên nhé!";
  if (s.includes("báo cáo") || s.includes("report")) return "Vào hồ sơ người dùng → nhấn 'Báo cáo' để xem biểu mẫu. Tính năng gửi báo cáo và chặn người dùng đang được hoàn thiện; hiện chưa gửi dữ liệu tới đội hỗ trợ.";
  if (s.includes("premium") || s.includes("phí") || s.includes("giá") || s.includes("free") || s.includes("gói")) return "Gói Free: 0₫, gồm ghép đôi cơ bản, trò chuyện và 5 lượt quét/tháng. Premium: 20.000₫/tháng hoặc 180.000₫/năm, tiết kiệm 60.000₫ (25%). Xem quyền lợi tại trang Premium.";
  if (s.includes("hồ sơ") || s.includes("profile")) return "Mẹo: ảnh rõ mặt, viết phần giới thiệu chân thật (~150 chữ), nêu thói quen sinh hoạt và kỳ vọng về bạn cùng phòng.";
  if (s.includes("dịch vụ") || s.includes("service")) return "Trang Dịch vụ có Giặt ủi, Dọn phòng, Chuyển nhà, Sửa chữa... Bạn cũng có thể đăng dịch vụ của mình tại đó.";
  if (s.includes("chat") || s.includes("tin nhắn")) return "Sau khi ghép đôi thành công, bạn có thể nhắn tin trực tiếp trong tab Tin nhắn.";
  if (s.includes("hi") || s.includes("chào") || s.includes("hello")) return "Xin chào! Mình là trợ lý RoomieMatch. Mình có thể giúp gì cho bạn?";
  return "Mình đã ghi nhận câu hỏi. Bạn có thể mô tả rõ hơn, hoặc xem mục Quy tắc cộng đồng và Cài đặt để biết thêm chi tiết nhé!";
}

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
    <span className={`relative block ${className}`} data-mascot-frame={frame}>
      <span className="mascot-halo absolute inset-[12%] rounded-full bg-teal/20" aria-hidden="true" />
      <img src={MASCOT_FRAMES[frame]} alt="" className="absolute inset-0 h-full w-full object-contain" />
    </span>
  );
}

export function AIChatbox() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "bot", text: "Chào bạn! Mình là trợ lý AI của RoomieMatch. Bạn cần hỗ trợ gì hôm nay?" },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<Set<number>>(new Set());
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(window.clearTimeout);
  }, []);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const close = () => { setOpen(false); triggerRef.current?.focus(); };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduceMotion ? "instant" : "smooth" });
  }, [msgs, open, reduceMotion]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setMsgs(m => [...m, { role: "user", text: t }]);
    setInput("");
    inputRef.current?.focus();
    const timer = window.setTimeout(() => {
      setMsgs(m => [...m, { role: "bot", text: reply(t) }]);
      timers.current.delete(timer);
    }, 450);
    timers.current.add(timer);
  };

  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 lg:bottom-5 lg:right-5 z-40">
      <style>{`
        @keyframes mascot-bob {
          0%, 100% { transform: translateY(0) rotate(-3deg) scale(1); }
          50% { transform: translateY(-7px) rotate(3deg) scale(1.035); }
        }
        @keyframes mascot-halo {
          0%, 100% { opacity: .2; transform: scale(.82); }
          50% { opacity: .65; transform: scale(1.12); }
        }
        .mascot-bob {
          animation: mascot-bob 1.8s ease-in-out infinite;
          transform-origin: 50% 90%;
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
                <div className="text-[11px] opacity-90">Trực tuyến</div>
              </div>
            </div>
            <button aria-label="Đóng trợ lý" onClick={close} className="hover:bg-white/10 rounded-lg p-1"><X className="h-4 w-4" /></button>
          </div>
          <div ref={scrollRef} role="log" aria-live="polite" className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 bg-muted/20">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.role === "user" ? "bg-navy text-white rounded-br-sm" : "bg-card border rounded-bl-sm"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {msgs.length <= 1 && (
              <div className="pt-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} className="text-xs px-2.5 py-1.5 rounded-full bg-card border hover:bg-mint/30 transition">{s}</button>
                ))}
              </div>
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="p-2 border-t flex gap-2 bg-card">
            <input
              ref={inputRef}
              aria-label="Câu hỏi cho trợ lý"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Nhập câu hỏi..."
              className="min-w-0 flex-1 h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-teal/40"
            />
            <Button type="submit" aria-label="Gửi câu hỏi" disabled={!input.trim()} size="icon" className="h-10 w-10 shrink-0 rounded-xl bg-teal hover:bg-teal/90"><Send className="h-4 w-4" /></Button>
          </form>
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
        <AnimatedMascot className="h-[5.4rem] w-[5.4rem] mascot-bob" />
        {open && (
          <span className="absolute -right-1 -top-1 h-7 w-7 rounded-full bg-navy text-white grid place-items-center shadow-md">
            <X className="h-4 w-4" />
          </span>
        )}
      </button>
    </div>
  );
}
