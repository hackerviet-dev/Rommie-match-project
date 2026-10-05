let loading: Promise<void> | undefined;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  const existing = (window as unknown as { google?: { maps?: { importLibrary?: unknown } } }).google;
  if (typeof existing?.maps?.importLibrary === "function") return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const host = window as unknown as Record<string, unknown>;
    const timer = window.setTimeout(() => fail(), 20000);
    const cleanup = () => { window.clearTimeout(timer); delete host.roomieMatchMapsReady; };
    const fail = () => { cleanup(); script.remove(); reject(new Error("Không tải được Google Maps. Hãy thử lại hoặc nhập địa chỉ thủ công.")); };
    host.roomieMatchMapsReady = () => { cleanup(); resolve(); };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&language=vi&region=VN&callback=roomieMatchMapsReady`;
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch(error => { loading = undefined; throw error; });
  return loading;
}
