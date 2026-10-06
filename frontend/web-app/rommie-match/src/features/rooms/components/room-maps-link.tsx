import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RoomMapsLink({ url }: { url: string }) {
  const [message, setMessage] = useState("");
  return <div className="mt-3 space-y-2 rounded-xl border p-3">
    <p className="text-sm font-medium">Link Google Maps của phòng</p>
    <div className="flex flex-wrap gap-2">
      <input aria-label="Link Google Maps của phòng" readOnly value={url} onFocus={e => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border bg-muted/20 px-3 py-2 text-sm" />
      <Button type="button" variant="outline" onClick={async () => {
        try { await navigator.clipboard.writeText(url); setMessage("Đã sao chép link Google Maps."); }
        catch { setMessage("Không sao chép tự động được. Chọn ô link và nhấn Ctrl+C hoặc dùng Sao chép trên điện thoại."); }
      }}><Copy size={16} />Sao chép link</Button>
    </div>
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </div>;
}
