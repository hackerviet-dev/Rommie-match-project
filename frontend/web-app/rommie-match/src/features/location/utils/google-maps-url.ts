export function isGoogleMapsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
    return (["www.google.com", "google.com", "www.google.com.vn", "google.com.vn"].includes(url.hostname) && url.pathname.startsWith("/maps"))
      || url.hostname === "maps.google.com" || url.hostname === "maps.app.goo.gl"
      || (url.hostname === "goo.gl" && url.pathname.startsWith("/maps/"));
  } catch { return false; }
}
