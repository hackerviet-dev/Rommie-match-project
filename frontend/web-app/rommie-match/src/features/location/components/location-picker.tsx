import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Navigation, Link as LinkIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { locationApi, type RoomLocation } from "../services/location-api";
import { loadGoogleMaps } from "@/integrations/google-maps/loader";

type LocationPickerProps = {
  onConfirm: (location: RoomLocation) => void;
  onPendingChange?: (pending: boolean) => void;
  initialPosition?: { latitude: number; longitude: number };
};

export function LocationPicker({ onConfirm, onPendingChange, initialPosition }: LocationPickerProps) {
  const config = useQuery({ queryKey: ["maps", "config"], queryFn: locationApi.config, staleTime: 300000 });
  const [mode, setMode] = useState("search"), [link, setLink] = useState("");
  const [candidate, setCandidate] = useState<RoomLocation>(), [isBusy, setIsBusy] = useState(false), [error, setError] = useState("");
  const [isReady, setIsReady] = useState(false), [isConfirmed, setIsConfirmed] = useState(false);
  const searchNode = useRef<HTMLDivElement>(null), mapNode = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null), marker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const revision = useRef(0), mounted = useRef(true), callbacks = useRef({ onConfirm, onPendingChange });
  callbacks.current = { onConfirm, onPendingChange };
  const pending = isBusy || Boolean(candidate && !isConfirmed);
  useEffect(() => { callbacks.current.onPendingChange?.(pending); }, [pending]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; callbacks.current.onPendingChange?.(false); }; }, []);

  async function handleResolve(resolve: () => Promise<RoomLocation>) {
    const current = ++revision.current;
    setIsBusy(true); setError(""); setIsConfirmed(false); setCandidate(undefined);
    try { const result = await resolve(); if (mounted.current && current === revision.current) setCandidate(result); }
    catch (e) { if (mounted.current && current === revision.current) setError(e instanceof Error ? e.message : "Không tìm được vị trí."); }
    finally { if (mounted.current && current === revision.current) setIsBusy(false); }
  }
  const resolveRef = useRef(handleResolve); resolveRef.current = handleResolve;
  const candidateRef = useRef(candidate); candidateRef.current = candidate;
  useEffect(() => {
    if (!config.data?.browserApiKey) return;
    let disposed = false;
    loadGoogleMaps(config.data.browserApiKey).then(() => { if (!disposed) { setIsReady(true); setError(""); } }).catch(e => { if (!disposed) setError(e.message); });
    return () => { disposed = true; };
  }, [config.data]);

  useEffect(() => {
    if (!isReady || !searchNode.current || mode !== "search") return;
    const node = searchNode.current;
    let disposed = false;
    let widget: google.maps.places.PlaceAutocompleteElement | undefined;
    void google.maps.importLibrary("places").then(library => {
      if (disposed) return;
      const { PlaceAutocompleteElement } = library as google.maps.PlacesLibrary;
      widget = new PlaceAutocompleteElement({ includedRegionCodes: ["vn"] });
      widget.setAttribute("aria-label", "Tìm địa chỉ phòng trên Google Maps");
      widget.addEventListener("gmp-select", (event: Event) => {
        const selected = event as google.maps.places.PlacePredictionSelectEvent;
        void resolveRef.current(async () => {
          const place = selected.placePrediction.toPlace();
          await place.fetchFields({ fields: ["formattedAddress", "addressComponents", "location", "id"] });
          if (!place.location) throw new Error("Địa điểm chưa có tọa độ. Hãy chọn gợi ý khác.");
          const component = (...types: string[]) => types.map(type => place.addressComponents?.find(c => c.types.includes(type))?.longText).find(Boolean) ?? "";
          return { address: place.formattedAddress ?? "", district: component("administrative_area_level_2", "sublocality_level_1", "locality"), city: component("administrative_area_level_1", "locality"), latitude: place.location.lat(), longitude: place.location.lng(), placeId: place.id };
        });
      });
      widget.addEventListener("gmp-error", () => setError("Google Places không phản hồi. Hãy thử lại hoặc nhập địa chỉ thủ công."));
      node.replaceChildren(widget);
    }).catch(() => { if (!disposed) setError("Không tải được gợi ý địa chỉ Google Maps."); });
    return () => { disposed = true; widget?.remove(); };
  }, [isReady, mode]);

  useEffect(() => {
    if (!isReady || !mapNode.current) return;
    let disposed = false;
    const node = mapNode.current;
    const listeners: google.maps.MapsEventListener[] = [];
    void Promise.all([google.maps.importLibrary("maps"), google.maps.importLibrary("marker")]).then(([maps, markers]) => {
      if (disposed) return;
      const { Map } = maps as google.maps.MapsLibrary;
      const { AdvancedMarkerElement } = markers as google.maps.MarkerLibrary;
      const center = initialPosition ? { lat: initialPosition.latitude, lng: initialPosition.longitude } : { lat: 10.7769, lng: 106.7009 };
      map.current = new Map(node, { center, zoom: initialPosition ? 17 : 12, mapId: config.data?.mapId || "DEMO_MAP_ID", streetViewControl: false, fullscreenControl: false });
      marker.current = new AdvancedMarkerElement({ map: map.current, position: initialPosition ? center : null, gmpDraggable: true, title: "Vị trí phòng — kéo để chỉnh" });
      if (candidateRef.current) {
        const point = { lat: candidateRef.current.latitude, lng: candidateRef.current.longitude };
        marker.current.position = point; map.current.panTo(point); map.current.setZoom(17);
      }
      listeners.push(marker.current.addListener("dragend", () => {
        const position = marker.current?.position;
        if (!position) return;
        const lat = typeof position.lat === "function" ? position.lat() : position.lat;
        const lng = typeof position.lng === "function" ? position.lng() : position.lng;
        void resolveRef.current(() => locationApi.reverse(lat, lng));
      }));
      listeners.push(map.current.addListener("click", (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        const lat = event.latLng.lat(), lng = event.latLng.lng();
        if (marker.current) marker.current.position = { lat, lng };
        void resolveRef.current(() => locationApi.reverse(lat, lng));
      }));
    }).catch(() => { if (!disposed) setError("Không tải được bản đồ chọn vị trí."); });
    return () => { disposed = true; listeners.forEach(l => l.remove()); if (marker.current) marker.current.map = null; map.current = null; marker.current = null; node.replaceChildren(); };
    // Initial position is only a starting camera; confirming is an explicit user action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, config.data?.mapId]);

  useEffect(() => {
    if (!candidate || !map.current || !marker.current) return;
    const point = { lat: candidate.latitude, lng: candidate.longitude };
    marker.current.position = point; map.current.panTo(point); map.current.setZoom(17);
  }, [candidate]);

  function handleLocate() {
    if (!navigator.geolocation) { setError("Trình duyệt không hỗ trợ định vị."); return; }
    void handleResolve(() => new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, e => reject(new Error(e.code === 1 ? "Bạn chưa cho phép định vị. Hãy tìm địa chỉ hoặc dán link Maps." : "Không xác định được vị trí. Hãy thử lại hoặc tìm địa chỉ.")), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })).then(p => locationApi.reverse(p.coords.latitude, p.coords.longitude)));
  }
  return (
    <section className="space-y-4 rounded-2xl border bg-muted/20 p-4 sm:p-5" aria-label="Chọn vị trí phòng">
      <h3 className="flex items-center gap-2 font-semibold"><MapPin size={19} /> Vị trí phòng</h3>
      <div className="flex flex-wrap gap-2">
        {[{ id: "search", label: "Tìm địa chỉ", icon: Search }, { id: "gps", label: "Vị trí hiện tại", icon: Navigation }, { id: "link", label: "Dán link Maps", icon: LinkIcon }].map(({ id, label, icon: Icon }) => <Button key={id} type="button" variant={mode === id ? "default" : "outline"} aria-pressed={mode === id} onClick={() => setMode(id)}><Icon size={16} />{label}</Button>)}
      </div>
      {config.isPending && <p role="status">Đang tải cấu hình bản đồ…</p>}
      {config.isError && <p role="alert" className="text-sm text-destructive">{config.error.message} <Button type="button" variant="outline" onClick={() => void config.refetch()}>Thử lại</Button></p>}
      {mode === "search" && <div ref={searchNode}>{!isReady && <p className="text-sm text-muted-foreground">{config.data?.browserApiKey ? "Đang tải Google Maps…" : "Chưa cấu hình Google Maps. Hãy nhập địa chỉ ở các ô bên dưới."}</p>}</div>}
      {mode === "gps" && <div className="space-y-2"><p className="text-sm text-muted-foreground">Chỉ dùng nếu bạn đang ở phòng. Kiểm tra và kéo ghim trước khi xác nhận.</p><Button type="button" variant="outline" disabled={isBusy || !config.data?.geocodingEnabled} onClick={handleLocate}>Cho phép lấy vị trí hiện tại</Button></div>}
      {mode === "link" && <div className="flex flex-wrap gap-2"><Input aria-label="Link Google Maps" value={link} onChange={e => setLink(e.target.value)} placeholder="https://maps.app.goo.gl/…" className="min-w-0 flex-1" /><Button type="button" disabled={isBusy || !link.trim() || !config.data?.geocodingEnabled} onClick={() => void handleResolve(() => locationApi.resolveLink(link.trim()))}>Tìm vị trí</Button></div>}
      {config.data && !config.data.geocodingEnabled && mode !== "search" && <p className="text-sm text-muted-foreground">Chưa cấu hình tra cứu địa chỉ phía máy chủ. Có thể nhập địa chỉ thủ công.</p>}
      {isReady && <div ref={mapNode} className="h-72 w-full rounded-xl" aria-label="Bản đồ kéo ghim vị trí phòng" />}
      {!isReady && candidate && <iframe title="Kiểm tra vị trí phòng" src={`https://maps.google.com/maps?q=${candidate.latitude},${candidate.longitude}&output=embed`} className="h-64 w-full rounded-xl border-0" />}
      {isBusy && <p role="status" className="text-sm">Đang tìm địa chỉ…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {pending && <Button type="button" variant="outline" onClick={() => { revision.current++; setIsBusy(false); setCandidate(undefined); setIsConfirmed(false); setError(""); }}>Bỏ vị trí này, nhập địa chỉ thủ công</Button>}
      {candidate && <div className="space-y-2 rounded-xl bg-white p-4"><p className="font-medium">{candidate.address}</p><p className="text-sm text-muted-foreground">{candidate.district} · {candidate.city}</p><p className="text-xs text-muted-foreground">Kết quả có thể thiếu số nhà/hẻm. Xác nhận đúng phòng rồi kiểm tra lại các ô địa chỉ.</p><Button type="button" variant={isConfirmed ? "outline" : "default"} disabled={isBusy || isConfirmed} onClick={() => { callbacks.current.onConfirm(candidate); setIsConfirmed(true); }}>{isConfirmed ? "Đã điền vị trí vào form" : "Xác nhận vị trí này"}</Button></div>}
      {candidate && !isReady && <p className="text-sm text-muted-foreground">Chưa tải được bản đồ kéo ghim. Hãy kiểm tra điểm trên bản đồ xem trước hoặc chọn vị trí khác.</p>}
    </section>
  );
}
