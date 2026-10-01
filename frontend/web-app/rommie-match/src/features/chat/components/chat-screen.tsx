import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Info, MessageCircle, Paperclip, Phone, Search, Send, ShieldCheck, Video, X } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell, Logo } from "@/layouts/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { conversations, sampleMessages } from "@/mocks/data/mock-data";

type DemoMessage = typeof sampleMessages[number];

export function ChatScreen() {
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [search, setSearch] = useState("");
  const [isUnreadOnly, setIsUnreadOnly] = useState(false);
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [threads, setThreads] = useState<Record<string, DemoMessage[]>>({ [conversations[0].id]: sampleMessages });
  const messagesRef = useRef<HTMLDivElement>(null);
  const active = conversations.find(item => item.id === activeId)!;
  const messages = threads[activeId] ?? [];
  const draft = drafts[activeId] ?? "";
  const visible = conversations.filter(item => (!isUnreadOnly || item.unread > 0) && item.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));

  useEffect(() => {
    const container = messagesRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [activeId, messages.length, isConversationOpen]);

  function handleSend() {
    if (!draft.trim()) return;
    const message = { id: Date.now(), from: "me", text: draft.trim(), time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) };
    setThreads(current => ({ ...current, [activeId]: [...(current[activeId] ?? []), message] }));
    setDrafts(current => ({ ...current, [activeId]: "" }));
  }

  return <AppShell fullHeight hideHeader>
    <div className="relative mx-auto grid h-full max-w-[1600px] min-h-0 bg-white md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_260px]">
      <aside className={`${isConversationOpen ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-border/70`}>
        <div className="px-5 pb-4 pt-5">
          <Logo className="mb-6 w-fit rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal" />
          <div className="flex items-center justify-between"><h1 className="text-2xl font-display font-bold">Tin nhắn</h1><span className="rounded-full bg-mint/25 px-2.5 py-1 text-[10px] font-medium text-teal">Bản xem trước</span></div>
          <div className="relative mt-5"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Tìm hội thoại" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm người trò chuyện" className="h-10 rounded-xl border-0 bg-muted/70 pl-9 shadow-none" /></div>
          <div className="mt-4 flex gap-2">{[{ label: "Tất cả", value: false }, { label: "Chưa đọc", value: true }].map(item => <button key={item.label} onClick={() => setIsUnreadOnly(item.value)} aria-pressed={isUnreadOnly === item.value} className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${isUnreadOnly === item.value ? "bg-mint/30 text-navy" : "text-muted-foreground hover:bg-muted"}`}>{item.label}</button>)}</div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {visible.map(item => <button key={item.id} onClick={() => { setActiveId(item.id); setIsConversationOpen(true); setIsInfoOpen(false); }} aria-current={activeId === item.id ? "true" : undefined} className={`my-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${activeId === item.id ? "bg-mint/20" : "hover:bg-muted/50"}`}>
            <div className="relative shrink-0"><img src={item.avatar} alt={item.name} className="h-12 w-12 rounded-full bg-mint/25" />{item.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-teal ring-2 ring-white" />}</div>
            <div className="min-w-0 flex-1"><div className="flex items-baseline justify-between gap-2"><span className="truncate text-sm font-semibold">{item.name}</span><span className="shrink-0 text-[10px] text-muted-foreground">{item.time}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{threads[item.id]?.at(-1)?.text ?? item.last}</p></div>
            {item.unread > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-teal px-1 text-[9px] font-semibold text-white">{item.unread}</span>}
          </button>)}
          {!visible.length && <p className="px-4 py-10 text-center text-sm text-muted-foreground">Không có hội thoại phù hợp.</p>}
        </div>
        <p className="border-t px-5 py-3 text-[11px] text-muted-foreground">Dữ liệu minh họa · Tin nhắn gửi thử chỉ lưu tạm.</p>
      </aside>
      <section aria-label={`Trò chuyện với ${active.name}`} className={`${isConversationOpen ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col`}>
        <header className="flex min-h-20 shrink-0 items-center gap-3 border-b border-border/60 px-4 lg:px-6">
          <Button variant="ghost" size="icon" aria-label="Quay lại danh sách tin nhắn" className="h-9 w-9 md:hidden" onClick={() => setIsConversationOpen(false)}><ArrowLeft /></Button>
          <img src={active.avatar} alt={active.name} className="h-10 w-10 rounded-full bg-mint/25" />
          <div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{active.name}</h2><p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><span className={`h-1.5 w-1.5 rounded-full ${active.online ? "bg-teal" : "bg-muted-foreground/50"}`} />{active.online ? "Đang hoạt động" : "Ngoại tuyến"}<span className="hidden sm:inline"> · Minh họa</span></p></div>
          <Button variant="ghost" size="icon" disabled aria-label="Gọi điện · Sắp có" title="Gọi điện · Sắp có" className="hidden h-9 w-9 sm:inline-flex"><Phone /></Button>
          <Button variant="ghost" size="icon" disabled aria-label="Gọi video · Sắp có" title="Gọi video · Sắp có" className="hidden h-9 w-9 sm:inline-flex"><Video /></Button>
          <Button variant="ghost" size="icon" aria-label="Thông tin hội thoại" aria-expanded={isInfoOpen} onClick={() => setIsInfoOpen(value => !value)} className="h-9 w-9 xl:hidden"><Info /></Button>
        </header>
        <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-4 py-6 sm:px-6">
          <div className="mb-7 text-center"><img src={active.avatar} alt="" className="mx-auto h-16 w-16 rounded-full bg-mint/20" /><p className="mt-3 font-semibold">{active.name}</p><p className="mt-1 text-xs text-muted-foreground">Bắt đầu bằng một lời chào, tìm hiểu cách sống của nhau.</p></div>
          {messages.length > 0 && <p className="mb-5 text-center text-[11px] text-muted-foreground">Cuộc trò chuyện minh họa</p>}
          <div className="space-y-4">{messages.map(message => <div key={message.id} className={`flex items-end gap-2 ${message.from === "me" ? "justify-end" : "justify-start"}`}>
            {message.from !== "me" && <img src={active.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full bg-mint/25" />}
            <div className="max-w-[85%] sm:max-w-[72%]"><p className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${message.from === "me" ? "rounded-br-md bg-navy text-white" : "rounded-bl-md bg-white text-foreground shadow-sm"}`}>{message.text}</p><p className={`mt-1 px-1 text-[10px] text-muted-foreground ${message.from === "me" ? "text-right" : ""}`}>{message.time}</p></div>
          </div>)}</div>
          {!messages.length && <div className="mx-auto mt-12 max-w-xs text-center"><MessageCircle className="mx-auto h-8 w-8 text-teal" /><p className="mt-3 text-sm text-muted-foreground">Bạn có thể gửi thử một lời chào trong bản xem trước này.</p></div>}
        </div>
        <footer className="shrink-0 border-t border-border/60 bg-white px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          <form onSubmit={event => { event.preventDefault(); handleSend(); }} className="flex items-end gap-2">
            <Button type="button" disabled variant="ghost" size="icon" aria-label="Đính kèm · Sắp có" title="Đính kèm · Sắp có" className="h-10 w-10 shrink-0"><Paperclip /></Button>
            <textarea aria-label="Nhập tin nhắn gửi thử" rows={1} maxLength={2000} value={draft} onChange={event => setDrafts(current => ({ ...current, [activeId]: event.target.value }))} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); handleSend(); } }} placeholder="Viết tin nhắn…" className="max-h-32 min-h-11 min-w-0 flex-1 resize-y rounded-2xl border-0 bg-muted/60 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-teal" />
            <Button type="submit" disabled={!draft.trim()} size="icon" aria-label="Gửi thử tin nhắn" className="h-10 w-10 shrink-0 rounded-full bg-teal text-white hover:bg-teal/90"><Send className="h-4 w-4" /></Button>
          </form>
        </footer>
      </section>
      <aside aria-label="Thông tin người trò chuyện" className={`${isInfoOpen ? "absolute inset-y-0 right-0 z-30 w-72 shadow-xl xl:static xl:w-auto xl:shadow-none" : "hidden xl:block"} overflow-y-auto border-l border-border/60 bg-white px-5 py-8`}>
        <Button variant="ghost" size="icon" aria-label="Đóng thông tin hội thoại" className="absolute right-2 top-2 h-8 w-8 xl:hidden" onClick={() => setIsInfoOpen(false)}><X /></Button>
        <img src={active.avatar} alt={active.name} className="mx-auto h-20 w-20 rounded-full bg-mint/25 ring-4 ring-mint/15" /><h2 className="mt-4 text-center font-semibold">{active.name}</h2><p className="mt-1 text-center text-xs text-muted-foreground">Người bạn đang trò chuyện</p>
        <div className="mt-7 rounded-2xl bg-mint/15 p-4"><h3 className="text-sm font-semibold">Gợi ý mở lời</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Hỏi về khu vực muốn ở, ngân sách và thói quen sinh hoạt để hiểu nhau hơn.</p></div>
        <div className="mt-5 border-t pt-5"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">An toàn khi kết nối</h3><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Bảo vệ thông tin cá nhân và xác minh phòng trước khi đặt cọc.</p><Button asChild variant="link" className="mt-3 h-auto p-0 text-xs text-teal"><Link to="/community-guidelines"><ShieldCheck className="h-4 w-4" />Quy tắc cộng đồng<ChevronRight className="h-3 w-3" /></Link></Button></div>
      </aside>
    </div>
  </AppShell>;
}
