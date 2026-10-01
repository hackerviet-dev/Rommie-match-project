import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VN_LOCATIONS } from "@/constants/locations";

export function HeaderSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get("q") ?? "");
  const [city, setCity] = useState(() => new URLSearchParams(location.search).get("city") ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const form = <form role="search" aria-label="Tìm kiếm trên RoomieMatch" onSubmit={event => {
    event.preventDefault();
    if (!query.trim() && !city) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (city) params.set("city", city);
    const target = location.pathname.startsWith("/rooms") ? "/rooms" : location.pathname.startsWith("/services") ? "/services" : "/matches";
    navigate(`${target}?${params}`);
    setIsOpen(false);
  }} className="flex w-full items-center rounded-full bg-muted/70 px-2">
    <MapPin aria-hidden="true" className="ml-1 h-4 w-4 shrink-0 text-teal" />
    <Select value={city || "all"} onValueChange={value => setCity(value === "all" ? "" : value)}>
      <SelectTrigger aria-label="Vị trí tìm kiếm" className="h-9 w-28 shrink-0 gap-1 rounded-full border-0 bg-transparent pl-1 pr-2 text-xs font-medium text-navy shadow-none focus:ring-0 focus-visible:underline focus-visible:decoration-teal focus-visible:underline-offset-4">
        <SelectValue placeholder="Vị trí" />
      </SelectTrigger>
      <SelectContent align="start" alignOffset={-28} sideOffset={6} className="max-h-72 min-w-56 rounded-2xl border-border/60 bg-popover p-1 shadow-lg">
        <SelectItem value="all" className="min-h-9 rounded-xl text-navy focus:bg-mint/25 focus:text-navy data-[state=checked]:bg-mint/30">Vị trí</SelectItem>
        {VN_LOCATIONS.map(place => <SelectItem key={place} value={place === "TP. Hồ Chí Minh" ? "TP.HCM" : place} className="min-h-9 rounded-xl text-navy focus:bg-mint/25 focus:text-navy data-[state=checked]:bg-mint/30">{place}</SelectItem>)}
      </SelectContent>
    </Select>
    <input aria-label="Từ khóa tìm kiếm" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm kiếm…" className="h-9 min-w-0 flex-1 rounded-full bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-teal" />
    <Button type="submit" variant="ghost" size="icon" aria-label="Tìm kiếm" className="h-8 w-8 shrink-0 rounded-full"><Search className="h-4 w-4" /></Button>
  </form>;
  return <>
    <div className="hidden w-full max-w-96 xl:block">{form}</div>
    <Popover open={isOpen} onOpenChange={setIsOpen}><PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="Mở tìm kiếm" className="h-9 w-9 rounded-full xl:hidden"><Search className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-3 xl:hidden">{form}<p className="mt-2 px-2 text-[11px] text-muted-foreground">Chọn vị trí và nhập từ khóa để tìm trên trang hiện tại.</p></PopoverContent></Popover>
  </>;
}
