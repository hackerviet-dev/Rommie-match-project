import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractGoogleMapsEmbedUrl } from "@/features/location/utils/google-maps-embed";
import { isGoogleMapsUrl } from "@/features/location/utils/google-maps-url";

type Props = { value: string; linkValue: string; onChange: (value: string) => void; onLinkChange: (value: string) => void; onPendingChange: (pending: boolean) => void; error?: string };
export function RoomLocationEditor({ value, linkValue, onChange, onLinkChange, onPendingChange, error }: Props) {
  const saved = value || linkValue;
  const [draft, setDraft] = useState(saved), [message, setMessage] = useState(""), [invalid, setInvalid] = useState(false);
  useEffect(() => { setDraft(saved); }, [saved]);
  useEffect(() => {
    onPendingChange(!saved || draft.trim() !== saved);
    return () => { onPendingChange(false); };
  }, [draft, saved, onPendingChange]);
  return <section aria-label="Vị trí phòng" className="space-y-4 rounded-2xl border bg-muted/20 p-4 sm:p-5">
    <h3 className="flex items-center gap-2 font-semibold"><MapPin size={19} />Vị trí phòng *</h3>
    <p id="room-map-help" className="text-sm text-muted-foreground">Mở Google Maps, chọn đúng vị trí phòng → Chia sẻ → Sao chép đường liên kết. Để hiện bản đồ ngay trong tin đăng, chọn Nhúng bản đồ → Sao chép HTML.</p>
    <label htmlFor="room-map-embed" className="block text-sm font-medium">Link hoặc mã nhúng Google Maps *</label>
    <textarea id="room-map-embed" value={draft} maxLength={8192} onChange={e => { setDraft(e.target.value); setMessage(""); setInvalid(false); }} placeholder="Dán link chia sẻ hoặc mã iframe từ Google Maps" className="min-h-28 w-full rounded-xl border bg-card p-3 text-sm" aria-describedby="room-map-help room-map-message room-map-error" aria-invalid={invalid || Boolean(error)} />
    <Button type="button" disabled={!draft.trim()} onClick={() => {
      const url = extractGoogleMapsEmbedUrl(draft);
      const link = draft.trim();
      if (!url && (link.length > 2048 || !isGoogleMapsUrl(link))) { setInvalid(true); setMessage("Link hoặc mã nhúng không hợp lệ. Hãy sao chép lại từ mục Chia sẻ trên Google Maps."); return; }
      onChange(url || ""); onLinkChange(url ? "" : link); setDraft(url || link); setInvalid(false); setMessage("Đã xác nhận vị trí. Gửi kiểm duyệt để lưu cùng tin đăng.");
    }}>Lưu vị trí</Button>
    {message && <p id="room-map-message" role={invalid ? "alert" : "status"} className={invalid ? "text-sm text-destructive" : "text-sm"}>{message}</p>}
    {error && <p id="room-map-error" role="alert" className="text-sm text-destructive">{error}</p>}
    {linkValue && <a href={linkValue} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium underline underline-offset-4">Mở vị trí phòng trên Google Maps</a>}
    {value && <iframe title="Xem trước bản đồ phòng" src={value} loading="lazy" referrerPolicy="no-referrer" className="h-64 w-full rounded-xl border-0" />}
    <p className="text-sm text-muted-foreground">Nhập số nhà, tên đường, phường/xã và tỉnh/thành phố bên dưới cho khớp bản đồ.</p>
  </section>;
}
