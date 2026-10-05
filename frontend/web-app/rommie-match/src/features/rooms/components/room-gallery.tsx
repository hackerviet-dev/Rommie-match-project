import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RoomGallery({ urls, title }: { urls: string[]; title: string }) {
  const [selected, setSelected] = useState(0), [failed, setFailed] = useState<string[]>([]);
  const index = Math.min(selected, Math.max(0, urls.length - 1));
  if (!urls.length) return <div className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-2xl border bg-muted/40 text-muted-foreground"><ImageOff size={32} /><p>Người đăng chưa bổ sung ảnh phòng.</p></div>;
  return <section aria-label="Hình ảnh phòng" className="overflow-hidden rounded-2xl border bg-white">
    <div className="relative flex h-72 items-center justify-center bg-slate-950 sm:h-[440px]">
      {failed.includes(urls[index]) ? <p role="alert" className="text-white">Không tải được ảnh này.</p> : <img src={urls[index]} alt={`${title} — ảnh ${index + 1}`} onError={() => setFailed(old => [...old, urls[index]])} className="h-full w-full object-contain" />}
      {urls.length > 1 && <><Button aria-label="Ảnh trước" variant="outline" size="icon" className="absolute left-3" onClick={() => setSelected((index - 1 + urls.length) % urls.length)}><ChevronLeft /></Button><Button aria-label="Ảnh tiếp theo" variant="outline" size="icon" className="absolute right-3" onClick={() => setSelected((index + 1) % urls.length)}><ChevronRight /></Button></>}
      <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-sm text-white" aria-live="polite">{index + 1}/{urls.length}</span>
    </div>
    <div className="flex gap-2 overflow-x-auto p-3">{urls.map((url, i) => <button key={url} type="button" aria-label={`Xem ảnh ${i + 1}`} aria-pressed={index === i} onClick={() => setSelected(i)} className={`shrink-0 overflow-hidden rounded-lg border-2 ${index === i ? "border-teal" : "border-transparent"}`}><img src={url} alt={`Ảnh nhỏ ${i + 1}`} className="h-16 w-24 object-cover" loading="lazy" /></button>)}</div>
  </section>;
}
