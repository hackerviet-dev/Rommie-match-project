import { CalendarDays, CreditCard, House, Plus, Receipt, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AccountSection } from "@/constants/account-sections";

export function AccountPreviewPanels({ section }: { section: AccountSection }) {
  if (section === "rooms") return <>
    <Card className="rounded-2xl border-mint/40 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Phòng bạn đăng</h2><p className="mt-1 text-sm text-muted-foreground">Tập hợp thông tin phòng, ảnh và nhu cầu tìm người ở ghép.</p></div><Button disabled><Plus className="h-4 w-4" /> Đăng phòng · Sắp có</Button></div>
      <div className="mt-8 rounded-2xl bg-muted/40 px-6 py-12 text-center"><House className="mx-auto h-10 w-10 text-teal" /><h3 className="mt-4 font-semibold">Không gian cho căn phòng của bạn</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Tính năng đăng, sửa và quản lý phòng đang được hoàn thiện.</p><Button asChild variant="outline" className="mt-5"><Link to="/rooms">Khám phá tìm phòng</Link></Button></div>
    </Card>
  </>;
  if (section === "bookings") return <Card className="rounded-2xl p-6 sm:p-8">
    <div className="flex flex-wrap gap-2 border-b pb-4"><span className="rounded-full bg-mint/30 px-4 py-2 text-sm font-medium text-navy">Lịch hẹn của bạn</span><span className="rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">Sắp có</span></div>
    <div className="px-4 py-12 text-center"><CalendarDays className="mx-auto h-10 w-10 text-teal" /><h2 className="mt-4 text-lg font-semibold">Mọi lịch hẹn, cùng một nơi</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Bạn sẽ có thể theo dõi lịch đặt, xem chi tiết và hủy dịch vụ tại đây.</p><Button asChild variant="outline" className="mt-5"><Link to="/services">Khám phá dịch vụ</Link></Button></div>
  </Card>;
  if (section === "billing") return <div className="space-y-5">
    <Card className="rounded-2xl border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 sm:p-8"><div className="flex items-center gap-3"><Sparkles className="h-6 w-6 text-amber-600" /><h2 className="text-xl font-semibold">Thêm cơ hội tìm người phù hợp</h2></div><p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">Khám phá quyền lợi Premium và chọn gói phù hợp với hành trình ở ghép của bạn.</p><Button asChild className="mt-5 rounded-full bg-amber-200 text-amber-950 hover:bg-amber-300"><Link to="/premium">Xem các gói Premium</Link></Button></Card>
    <Card className="rounded-2xl p-6"><h2 className="flex items-center gap-2 font-semibold"><Receipt className="h-5 w-5 text-teal" />Lịch sử thanh toán</h2><div className="mt-5 rounded-xl bg-muted/40 py-10 text-center"><CreditCard className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Lịch sử giao dịch và chi tiết hóa đơn sẽ có tại đây.</p><span className="mt-3 inline-block rounded-full bg-mint/30 px-3 py-1 text-xs text-navy">Sắp có</span></div><p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />Thông tin gói và thanh toán được quản lý riêng với hồ sơ.</p></Card>
  </div>;
  return null;
}
