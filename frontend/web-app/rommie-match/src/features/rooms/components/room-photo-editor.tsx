import { useRef, useState, useEffect } from "react";
import { ImagePlus, ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { roomsApi } from "../services/rooms-api";

type RoomPhotoEditorProps = { validationError?: string; urls: string[]; onChange: (urls: string[]) => void; onBusyChange: (busy: boolean) => void };
export function RoomPhotoEditor({ urls, onChange, onBusyChange, validationError }: RoomPhotoEditorProps) {
  const [isBusy, setIsBusy] = useState(false), [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const mounted = useRef(true), input = useRef<HTMLInputElement>(null);
  const callbacks = useRef({ onChange, onBusyChange }); callbacks.current = { onChange, onBusyChange };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function handleUpload(files: File[]) {
    if (isBusy) return;
    if (files.length + urls.length > 10) { setError("Tối đa 10 ảnh phòng. Hãy chọn ít ảnh hơn."); return; }
    if (files.some(f => !["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 10 * 1024 * 1024)) { setError("Chọn ảnh JPEG, PNG hoặc WebP, tối đa 10 MB mỗi ảnh."); return; }
    setIsBusy(true); callbacks.current.onBusyChange(true); setError("");
    const uploaded = [...urls];
    try {
      for (let i = 0; i < files.length; i++) {
        if (!mounted.current) break;
        setMessage(`Đang upload ảnh ${i + 1}/${files.length}…`);
        const result = await roomsApi.uploadPhoto(files[i]);
        if (!mounted.current) break;
        uploaded.push(result.url); callbacks.current.onChange([...uploaded]);
      }
    } catch (e) { if (mounted.current) setError(`${e instanceof Error ? e.message : "Upload thất bại."} Các ảnh đã upload vẫn được giữ; chọn lại ảnh bị lỗi để thử lại.`); }
    finally { if (mounted.current) { setIsBusy(false); setMessage(""); callbacks.current.onBusyChange(false); } }
  }
  function handleMove(index: number, direction: number) {
    const ordered = [...urls], next = index + direction;
    [ordered[index], ordered[next]] = [ordered[next], ordered[index]]; onChange(ordered);
  }
  return <section className="space-y-3 rounded-2xl border p-5 sm:col-span-2">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Ảnh phòng *</h3><p className="text-sm text-muted-foreground">Tối đa 10 ảnh · 10 MB/ảnh · ảnh đầu tiên là ảnh bìa.</p></div><Button type="button" variant="outline" disabled={isBusy || urls.length >= 10} onClick={() => input.current?.click()}><ImagePlus size={16} /> Thêm ảnh</Button></div>
    <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Upload ảnh phòng" disabled={isBusy} onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length) void handleUpload(files); }} />
    {!urls.length && <p className="rounded-xl bg-muted/40 p-5 text-sm text-muted-foreground">Chưa có ảnh. Thêm ảnh thật để người tìm phòng xem không gian và tiện nghi.</p>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{urls.map((url, i) => <div key={url} className="overflow-hidden rounded-xl border"><img src={url} alt={`Ảnh phòng ${i + 1}`} className="aspect-[4/3] w-full object-cover" /><div className="flex flex-wrap items-center justify-between gap-1 p-2"><span className="text-xs">{i === 0 ? "Ảnh bìa" : `Ảnh ${i + 1}`}</span><div className="flex"><Button type="button" size="icon" className="h-7 w-7" variant="ghost" disabled={isBusy || i === 0} aria-label={`Đưa ảnh ${i + 1} lên trước`} onClick={() => handleMove(i, -1)}><ArrowLeft size={14} /></Button><Button type="button" size="icon" className="h-7 w-7" variant="ghost" disabled={isBusy || i === urls.length - 1} aria-label={`Đưa ảnh ${i + 1} ra sau`} onClick={() => handleMove(i, 1)}><ArrowRight size={14} /></Button><Button type="button" size="icon" className="h-7 w-7" variant="ghost" disabled={isBusy} aria-label={`Bỏ ảnh ${i + 1}`} onClick={() => onChange(urls.filter((_, j) => i !== j))}><X size={14} /></Button></div></div></div>)}</div>
    {validationError && <p role="alert" className="text-sm text-destructive">{validationError}</p>}{message && <p role="status" className="text-sm">{message}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <p className="text-xs text-muted-foreground">Ảnh chỉ được gắn vào tin khi lưu; nội dung và ảnh gửi lên sẽ chờ kiểm duyệt.</p>
  </section>;
}
