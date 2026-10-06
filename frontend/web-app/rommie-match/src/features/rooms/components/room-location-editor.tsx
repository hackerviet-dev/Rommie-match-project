import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { locationApi } from "@/features/location/services/location-api";
import { extractGoogleMapsEmbedUrl } from "@/features/location/utils/google-maps-embed";

type Props = { value: string; onChange: (value: string) => void; onPendingChange: (pending: boolean) => void; error?: string; children: ReactNode };
export function RoomLocationEditor({ value, onChange, onPendingChange, error, children }: Props) {
  const config = useQuery({ queryKey: ["maps", "config"], queryFn: locationApi.config, staleTime: 300000 });
  const [draft, setDraft] = useState(value), [message, setMessage] = useState("");
  const hasMaps = Boolean(config.data?.browserApiKey && config.data.geocodingEnabled);
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => {
    if (!hasMaps) onPendingChange(!value || draft.trim() !== value);
    return () => { if (!hasMaps) onPendingChange(false); };
  }, [hasMaps, draft, value, onPendingChange]);
  if (config.isPending) return <p role="status">Đang kiểm tra tính năng vị trí…</p>;
  if (hasMaps) return children;
  return <section aria-label="Nhúng bản đồ phòng" className="space-y-4 rounded-2xl border bg-muted/20 p-4 sm:p-5">
    <h3 className="flex items-center gap-2 font-semibold"><MapPin size={19} />Vị trí phòng *</h3>
    <Button type="button" aria-pressed><Code size={16} />Nhúng bản đồ</Button>
    <p className="text-sm text-muted-foreground">Tìm địa chỉ và định vị hiện chưa khả dụng. Mở Google Maps, chọn đúng phòng → Chia sẻ → Nhúng bản đồ → Sao chép HTML, rồi dán vào ô bên dưới.</p>
    <label htmlFor="room-map-embed" className="block text-sm font-medium">Mã nhúng Google Maps *</label>
    <textarea id="room-map-embed" value={draft} onChange={e => { setDraft(e.target.value); setMessage(""); }} placeholder={'<iframe src="https://www.google.com/maps/embed?pb=…" ...></iframe>'} className="min-h-28 w-full rounded-xl border bg-white p-3 text-sm" aria-invalid={Boolean(error)} />
    <Button type="button" disabled={!draft.trim()} onClick={() => {
      const url = extractGoogleMapsEmbedUrl(draft);
      if (!url) { setMessage("Mã nhúng không hợp lệ. Hãy sao chép HTML từ mục Nhúng bản đồ trên Google Maps."); return; }
      onChange(url); setDraft(url); setMessage("Đã giữ bản đồ trong form. Gửi kiểm duyệt để lưu cùng bài đăng.");
    }}>Lưu vị trí</Button>
    {message && <p role="status" className="text-sm">{message}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {value && <iframe title="Xem trước bản đồ phòng" src={value} loading="lazy" referrerPolicy="no-referrer" className="h-64 w-full rounded-xl border-0" />}
    <p className="text-xs text-muted-foreground">Kiểm tra đúng điểm phòng trên bản đồ. Địa chỉ, khu vực và thành phố vẫn cần nhập đầy đủ bên dưới.</p>
  </section>;
}
