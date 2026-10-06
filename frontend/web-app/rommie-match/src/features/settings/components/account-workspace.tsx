import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList } from "lucide-react";

import { ACCOUNT_SECTIONS, type AccountSection } from "@/constants/account-sections";
import { Button } from "@/components/ui/button";
import { RoomNotificationBadge } from "@/features/notifications";

export function AccountWorkspace({ section, children }: { section: AccountSection; children: ReactNode }) {
  const current = ACCOUNT_SECTIONS.find((item) => item.id === section)!;
  return <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tài khoản của bạn</p>
      <nav aria-label="Quản lý tài khoản" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
        {ACCOUNT_SECTIONS.map(({ id, label, icon: Icon }) => <Link key={id} to={`/settings?section=${id}`} aria-current={section === id ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${section === id ? "bg-navy text-white shadow-sm" : "bg-white/60 text-muted-foreground hover:bg-mint/25 hover:text-navy"}`}><Icon className="h-4 w-4" />{label}{id === "rooms" && <RoomNotificationBadge />}</Link>)}
      </nav>
      <div className="mt-5 hidden rounded-2xl bg-mint/20 p-4 lg:block">
        <ClipboardList className="mb-2 h-5 w-5 text-teal" />
        <p className="text-sm font-semibold">Tìm người ở ghép hợp với bạn</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Bổ sung lối sống và làm khảo sát để hiểu nhau hơn.</p>
        <Button asChild variant="link" className="mt-2 h-auto p-0 text-teal"><Link to="/onboarding">Hoàn thiện hồ sơ <ArrowRight className="h-4 w-4" /></Link></Button>
      </div>
    </aside>
    <section className="min-w-0">
      <h1 className="text-3xl font-display font-bold">{current.label}</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground">{current.description}</p>
      {children}
    </section>
  </div>;
}
