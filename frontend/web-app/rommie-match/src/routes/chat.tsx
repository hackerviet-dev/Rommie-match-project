import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { conversations, sampleMessages } from "@/lib/mock-data";
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Phone,
  Video,
  Search,
  MoreVertical,
} from "lucide-react";

export default function Chat() {
  const [active, setActive] = useState(conversations[0]);
  const [msg, setMsg] = useState("");
  const [msgs, setMsgs] = useState(sampleMessages);

  const send = () => {
    if (!msg.trim()) return;
    setMsgs([...msgs, { id: Date.now(), from: "me", text: msg, time: "vừa xong" }]);
    setMsg("");
  };

  return (
    <AppShell>
      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden h-[calc(100vh-12rem)] grid md:grid-cols-[320px_1fr]">
        <aside className="border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-display font-bold text-lg">Tin nhắn</h2>
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm kiếm" className="pl-9 h-10 rounded-xl" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className={`w-full p-4 flex gap-3 items-center text-left hover:bg-muted/50 border-b ${active.id === c.id ? "bg-mint/15" : ""}`}
              >
                <div className="relative shrink-0">
                  <img src={c.avatar} className="h-12 w-12 rounded-2xl bg-mint/30" />
                  {c.online && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-mint ring-2 ring-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <div className="font-semibold text-sm truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground shrink-0">{c.time}</div>
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{c.last}</div>
                </div>
                {c.unread > 0 && (
                  <span className="ml-1 h-5 min-w-5 px-1.5 rounded-full bg-teal text-white text-[10px] font-bold grid place-items-center">
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex flex-col min-h-0">
          <header className="p-4 border-b flex items-center gap-3">
            <div className="relative">
              <img src={active.avatar} className="h-11 w-11 rounded-2xl bg-mint/30" />
              {active.online && (
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-mint ring-2 ring-card" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{active.name}</div>
              <div className="text-xs text-teal">
                {active.online ? "Đang hoạt động · 96% hợp" : "Ngoại tuyến"}
              </div>
            </div>
            <Button size="icon" variant="ghost">
              <Phone className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost">
              <Video className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gradient-to-b from-mint/5 to-transparent">
            <div className="text-center text-xs text-muted-foreground my-4">Hôm nay</div>
            {msgs.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${m.from === "me" ? "bg-navy text-white rounded-br-md" : "bg-card border rounded-bl-md"}`}
                >
                  {m.text}
                  <div
                    className={`text-[10px] mt-1 ${m.from === "me" ? "text-white/70" : "text-muted-foreground"}`}
                  >
                    {m.time}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-start">
              <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                <span
                  className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                  style={{ animationDelay: "0s" }}
                />
                <span
                  className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                  style={{ animationDelay: "0.3s" }}
                />
              </div>
            </div>
          </div>

          <footer className="p-4 border-t bg-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2"
            >
              <Button type="button" size="icon" variant="ghost">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost">
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Nhập tin nhắn…"
                className="h-11 rounded-full bg-muted border-0"
              />
              <Button
                type="submit"
                size="icon"
                className="rounded-full bg-teal hover:bg-teal/90 text-white shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </footer>
        </section>
      </Card>
    </AppShell>
  );
}
