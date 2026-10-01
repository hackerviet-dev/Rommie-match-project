const KEY = "roomiematch:saved-profiles";

export function getSaved(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : [];
  } catch {
    return [];
  }
}

export function isSaved(id: string): boolean {
  return getSaved().includes(id);
}

export function toggleSaved(id: string): boolean {
  const list = getSaved();
  const idx = list.indexOf(id);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(id);
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("saved-profiles-changed"));
  return idx < 0;
}

export function removeSaved(id: string) {
  const list = getSaved().filter(x => x !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("saved-profiles-changed"));
}
