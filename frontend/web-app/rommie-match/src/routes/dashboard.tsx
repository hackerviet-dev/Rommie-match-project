import { Link } from "react-router-dom";
import { useState } from "react";
import { AppShell, CompatRing } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { roommates, quizQuestions } from "@/lib/mock-data";
import {
  Heart,
  MessageCircle,
  Store,
  Bookmark,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ClipboardList,
  CheckCircle2,
  Eye,
} from "lucide-react";

export default function Dashboard() {
  const quizHistory = [
    {
      date: "12/06/2026",
      title: "Trắc nghiệm tính cách & lối sống",
      score: 92,
      tag: "Hướng nội · Gọn gàng",
      status: "Hoàn thành",
      answers: [1, 0, 1, 0, 1],
    },
    {
      date: "28/05/2026",
      title: "Trắc nghiệm tương thích mở rộng",
      score: 88,
      tag: "Cú đêm · Linh hoạt",
      status: "Hoàn thành",
      answers: [0, 1, 0, 2, 1],
    },
    {
      date: "10/05/2026",
      title: "Trắc nghiệm ngân sách & khu vực",
      score: 95,
      tag: "Quận 1 · 4–6 triệu",
      status: "Hoàn thành",
      answers: [1, 0, 1, 0, 0],
    },
    {
      date: "22/04/2026",
      title: "Trắc nghiệm cơ bản",
      score: 80,
      tag: "Sinh viên · Năm 3",
      status: "Hoàn thành",
      answers: [2, 1, 2, 1, 2],
    },
  ];
  const [openQuiz, setOpenQuiz] = useState<number | null>(null);
  const active = openQuiz !== null ? quizHistory[openQuiz] : null;
  const stats = [
    {
      i: Heart,
      label: "Kết quả ghép đôi",
      value: "24",
      change: "+6 tuần này",
      color: "from-teal/20 to-teal/5",
      icon: "text-teal",
    },
    {
      i: MessageCircle,
      label: "Tin nhắn",
      value: "8",
      change: "3 chưa đọc",
      color: "from-navy/15 to-navy/5",
      icon: "text-navy",
    },
    {
      i: Bookmark,
      label: "Hồ sơ đã lưu",
      value: "12",
      change: "+2 hôm nay",
      color: "from-mint/40 to-mint/10",
      icon: "text-navy",
    },
    {
      i: Store,
      label: "Dịch vụ gần đây",
      value: "32",
      change: "trong 2 km",
      color: "from-amber-200/40 to-amber-100/10",
      icon: "text-amber-600",
    },
  ];
  return (
    <AppShell>
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Chào mừng trở lại, Linh 👋</h1>
          <p className="text-muted-foreground mt-1">
            Đây là những gì đang diễn ra với hành trình tìm bạn của bạn.
          </p>
        </div>
        <Link to="/matches">
          <Button className="rounded-full bg-navy hover:bg-navy/90 text-white">
            Xem ghép đôi <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className={`p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br ${s.color}`}
          >
            <div className={`h-10 w-10 rounded-xl bg-white/70 grid place-items-center ${s.icon}`}>
              <s.i className="h-5 w-5" />
            </div>
            <div className="mt-4 text-3xl font-display font-bold">{s.value}</div>
            <div className="text-sm font-medium mt-0.5">{s.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.change}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-display font-bold text-lg">Hoàn thiện hồ sơ</div>
                <div className="text-sm text-muted-foreground">
                  Hồ sơ đầy đủ nhận được nhiều hơn gấp 3 lần ghép đôi.
                </div>
              </div>
              <Badge className="rounded-full bg-mint/40 text-navy border-0">85%</Badge>
            </div>
            <Progress value={85} className="mt-4 h-2.5" />
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-full bg-mint/30 text-navy font-medium">
                ✓ Thông tin cơ bản
              </span>
              <span className="px-3 py-1.5 rounded-full bg-mint/30 text-navy font-medium">
                ✓ Lối sống
              </span>
              <span className="px-3 py-1.5 rounded-full bg-mint/30 text-navy font-medium">
                ✓ Trắc nghiệm
              </span>
              <span className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
                + Thêm ảnh
              </span>
              <span className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
                + Xác minh CCCD
              </span>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="font-display font-bold text-lg">Gợi ý cho bạn</div>
              <Link to="/matches" className="text-sm text-teal font-medium hover:underline">
                Xem tất cả
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {roommates.slice(0, 4).map((r) => (
                <Link key={r.id} to={`/profile/${r.id}`} className="group">
                  <div className="flex items-center gap-4 p-4 rounded-2xl border hover:border-teal/40 hover:shadow-md transition-all">
                    <img src={r.avatar} className="h-14 w-14 rounded-xl bg-mint/30" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{r.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.occupation} · {r.age}
                      </div>
                    </div>
                    <CompatRing score={r.score} size={48} />
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="font-display font-bold text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-teal" /> Lịch sử bài trắc nghiệm
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  Theo dõi sự thay đổi tính cách & lối sống theo thời gian.
                </div>
              </div>
              <Link to="/quiz" className="text-sm text-teal font-medium hover:underline">
                Làm lại
              </Link>
            </div>
            <ul className="space-y-3">
              {quizHistory.map((q, i) => (
                <li
                  key={i}
                  className="flex items-center gap-4 p-3 rounded-xl border hover:border-teal/40 transition-colors"
                >
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-mint/30 grid place-items-center text-navy">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{q.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {q.date} · {q.tag}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-display font-bold text-teal">
                      {q.score}
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                    <Badge variant="outline" className="rounded-full text-[10px] mt-0.5">
                      {q.status}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setOpenQuiz(i)}
                    className="rounded-full text-teal hover:bg-mint/30 hover:text-teal"
                  >
                    <Eye className="h-4 w-4 mr-1" /> Xem
                  </Button>
                </li>
              ))}
            </ul>
          </Card>

          <Dialog open={openQuiz !== null} onOpenChange={(o) => !o && setOpenQuiz(null)}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{active?.title}</DialogTitle>
                <DialogDescription>
                  {active?.date} · {active?.tag} · Điểm:{" "}
                  <span className="text-teal font-bold">{active?.score}/100</span>
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2 space-y-4">
                {active &&
                  quizQuestions.map((qq, qi) => {
                    const pickedIdx = active.answers[qi];
                    return (
                      <div key={qi} className="p-4 rounded-xl border bg-muted/30">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{qq.emoji}</div>
                          <div className="flex-1">
                            <div className="text-xs uppercase tracking-wider text-teal font-semibold">
                              Câu {qi + 1}
                            </div>
                            <div className="font-semibold mt-1 leading-snug">{qq.q}</div>
                            <div className="mt-3 space-y-2">
                              {qq.options.map((opt, oi) => {
                                const isPicked = oi === pickedIdx;
                                return (
                                  <div
                                    key={oi}
                                    className={`flex items-center gap-2 p-2.5 rounded-lg text-sm ${isPicked ? "bg-mint/30 border border-teal/40 font-medium text-navy" : "text-muted-foreground"}`}
                                  >
                                    <div
                                      className={`h-5 w-5 rounded-full grid place-items-center shrink-0 ${isPicked ? "bg-teal text-white" : "border border-border"}`}
                                    >
                                      {isPicked && <CheckCircle2 className="h-3.5 w-3.5" />}
                                    </div>
                                    <span>
                                      {String.fromCharCode(65 + oi)}. {opt}
                                    </span>
                                    {isPicked && (
                                      <Badge className="ml-auto bg-teal text-white border-0 rounded-full text-[10px]">
                                        Đã chọn
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-6">
          <Card className="p-6 rounded-2xl border-0 shadow-sm">
            <div className="font-display font-bold text-lg">Hoạt động gần đây</div>
            <ul className="mt-4 space-y-4">
              {[
                { i: Heart, t: "Linh đã xem hồ sơ của bạn", time: "2 phút trước" },
                { i: MessageCircle, t: "Tin nhắn mới từ Minh", time: "1 giờ trước" },
                { i: Sparkles, t: "Ghép đôi mới 92%: Hà My", time: "3 giờ trước" },
                { i: TrendingUp, t: "Hồ sơ của bạn đang nổi ở Quận 1", time: "1 ngày trước" },
              ].map((a, i) => (
                <li key={i} className="flex gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-mint/30 grid place-items-center text-navy">
                    <a.i className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{a.t}</div>
                    <div className="text-xs text-muted-foreground">{a.time}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6 rounded-2xl border-0 shadow-md gradient-brand text-white">
            <Sparkles className="h-6 w-6" />
            <div className="mt-3 font-display font-bold text-lg">Nâng cấp Premium</div>
            <p className="text-sm text-white/85 mt-1">
              Mở khoá bộ lọc nâng cao, boost hồ sơ và ghép đôi ưu tiên.
            </p>
            <Link to="/premium">
              <Button className="mt-4 w-full rounded-xl bg-white text-navy hover:bg-white/90">
                Nâng cấp 20.000₫/tháng
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
