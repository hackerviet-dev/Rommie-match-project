import { useState } from "react";
import { House, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

import { AppShell } from "@/layouts/main-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RoomsPage() {
  const [area, setArea] = useState("");
  const [budget, setBudget] = useState("all");
  return <AppShell>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-sm font-medium text-teal">Một nơi ở, nhiều kết nối</p><h1 className="text-3xl font-display font-bold sm:text-4xl">Tìm căn phòng phù hợp với bạn</h1><p className="mt-3 text-muted-foreground">Chọn khu vực và ngân sách để bắt đầu hành trình ở ghép.</p></div><Button asChild variant="outline"><Link to="/settings?section=rooms"><House className="h-4 w-4" />Phòng của tôi</Link></Button></div>
    <Card className="mt-8 rounded-2xl border-mint/40 p-5 sm:p-6">
      <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_200px_auto]">
        <div><Label htmlFor="room-area">Khu vực mong muốn</Label><div className="relative mt-2"><MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="room-area" value={area} onChange={event => setArea(event.target.value)} placeholder="Thành phố, quận hoặc khu vực" className="pl-9" /></div></div>
        <div><Label htmlFor="room-budget">Ngân sách mỗi tháng</Label><select id="room-budget" value={budget} onChange={event => setBudget(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="all">Tất cả mức giá</option><option value="under3">Dưới 3 triệu</option><option value="3to5">3–5 triệu</option><option value="over5">Trên 5 triệu</option></select></div>
        <Button disabled><Search className="h-4 w-4" />Tìm phòng · Sắp có</Button>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="h-4 w-4" />Bạn sẽ có thể lọc theo tiện ích, loại phòng và thời gian dọn vào.</p>
    </Card>
    <div className="mt-6 grid gap-4 sm:grid-cols-3">{[{ title: "Khu vực thuận tiện", desc: "Gần trường học, nơi làm việc và những nơi bạn thường đến.", icon: MapPin }, { title: "Ngân sách phù hợp", desc: "Dễ so sánh tiền phòng và chi phí sinh hoạt.", icon: SlidersHorizontal }, { title: "Sống cùng người hợp", desc: "Tìm người ở ghép có lối sống và mong muốn tương đồng.", icon: House }].map(({ title, desc, icon: Icon }) => <Card key={title} className="rounded-2xl border-0 bg-mint/15 p-5"><Icon className="h-5 w-5 text-teal" /><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p></Card>)}</div>
    <div className="mt-8 rounded-3xl border border-dashed border-mint bg-white/50 px-6 py-14 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-mint/30"><House className="h-8 w-8 text-navy" /></div><h2 className="mt-5 text-xl font-semibold">Những căn phòng mới đang được chuẩn bị</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Tính năng tìm và đăng phòng sẽ sớm có mặt. Bạn có thể khám phá người ở ghép trong lúc chờ.</p><Button asChild className="mt-5"><Link to="/matches">Khám phá ở ghép</Link></Button></div>
  </AppShell>;
}
