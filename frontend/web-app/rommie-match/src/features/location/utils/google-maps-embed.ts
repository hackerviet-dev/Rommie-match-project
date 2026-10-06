export function isGoogleMapsEmbedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return value.length <= 8192 && url.protocol === "https:" && !url.username && !url.password && !url.port
      && ["www.google.com", "google.com"].includes(url.hostname)
      && url.pathname === "/maps/embed" && Boolean(url.searchParams.get("pb")?.trim());
  } catch { return false; }
}

export function extractGoogleMapsEmbedUrl(value: string): string | null {
  const trimmed = value.trim();
  const src = trimmed.startsWith("<") ? trimmed.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]?.replace(/&amp;/g, "&") : trimmed;
  return src && isGoogleMapsEmbedUrl(src) ? src : null;
}
