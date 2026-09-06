import { Link } from "react-router-dom";
import * as m from "motion/react-m";
import { Logo } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Heart,
  Brain,
  Shield,
  Sparkles,
  MessageCircle,
  Home,
  Check,
  Star,
  ArrowRight,
  Droplet,
  Shirt,
  Wrench,
  Wifi,
} from "lucide-react";
import { CompatRing } from "@/components/app-shell";

function Nav() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-border/50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground">
            Tính năng
          </a>
          <a href="#how" className="hover:text-foreground">
            Cách hoạt động
          </a>
          <a href="#premium" className="hover:text-foreground">
            Premium
          </a>
          <Link to="/community-guidelines" className="hover:text-foreground">Quy tắc cộng đồng</Link>
          <a href="#faq" className="hover:text-foreground">
            Hỏi đáp
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" className="rounded-full">
              Đăng nhập
            </Button>
          </Link>
          <Link to="/register">
            <Button className="rounded-full bg-navy hover:bg-navy/90 text-white">Đăng ký</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Nav />

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-mint/40 blur-3xl" />
          <div className="absolute top-20 -right-32 h-96 w-96 rounded-full bg-teal/30 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <m.div
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
          >
            <Badge className="rounded-full bg-mint/30 text-navy border-0 hover:bg-mint/30 px-3 py-1.5">
              <Sparkles className="h-3 w-3 mr-1.5" /> Ghép đôi bằng AI · v2.0
            </Badge>
            <h1 className="mt-5 text-5xl sm:text-6xl font-display font-extrabold leading-[1.05] tracking-tight">
              Tìm bạn cùng phòng&nbsp;thật sự{" "}
              <span className="text-gradient-brand">hợp với bạn</span>.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg">
              RoomieMatch dùng dữ liệu lối sống, tính cách và thói quen để ghép sinh viên và người
              trẻ với bạn cùng phòng thực sự phù hợp — không chỉ là người có phòng trống.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="lg" className="rounded-full bg-navy hover:bg-navy/90 text-white px-6">
                  Tìm người hợp với mình <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/quiz">
                <Button size="lg" variant="outline" className="rounded-full px-6">
                  Làm bài trắc nghiệm
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["A", "B", "C", "D"].map((s) => (
                  <img
                    key={s}
                    src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${s}&backgroundColor=8FD3C1,15A9B8`}
                    className="h-9 w-9 rounded-full ring-2 ring-background"
                  />
                ))}
              </div>
              <div>
                <span className="font-semibold text-foreground">12.400+</span> bạn cùng phòng đã
                được ghép
              </div>
            </div>
          </m.div>

          <m.div
            className="relative"
            initial={{ opacity: 0, x: 28, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.08 }}
          >
            <div className="absolute -inset-6 gradient-brand opacity-10 rounded-[3rem] blur-2xl" />
            <Card className="relative p-6 rounded-3xl shadow-2xl border-0 bg-card animate-float">
              <div className="flex items-center gap-4">
                <img
                  src="https://api.dicebear.com/9.x/avataaars/svg?seed=Linh&backgroundColor=8FD3C1"
                  className="h-16 w-16 rounded-2xl bg-mint/30"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-lg">Nguyễn Linh, 23</div>
                  <div className="text-sm text-muted-foreground">Nhà thiết kế UX · Quận 1</div>
                </div>
                <CompatRing score={96} size={72} />
              </div>
              <div className="mt-5 space-y-3">
                {[
                  { l: "Giờ giấc ngủ", v: 95 },
                  { l: "Sạch sẽ", v: 98 },
                  { l: "Phong cách xã hội", v: 88 },
                  { l: "Ngân sách", v: 92 },
                ].map((b) => (
                  <div key={b.l}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{b.l}</span>
                      <span className="font-semibold">{b.v}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full gradient-brand rounded-full"
                        style={{ width: `${b.v}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button className="mt-5 w-full rounded-full bg-teal hover:bg-teal/90 text-white">
                <MessageCircle className="mr-2 h-4 w-4" /> Chào nào
              </Button>
            </Card>
            <Card className="absolute -bottom-6 -left-6 hidden sm:block p-3 pr-4 rounded-2xl shadow-xl border-0 bg-card">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-mint/40 grid place-items-center">✨</div>
                <div className="text-sm">
                  <div className="font-semibold">Ghép đôi mới!</div>
                  <div className="text-xs text-muted-foreground">92% với Minh</div>
                </div>
              </div>
            </Card>
          </m.div>
        </div>
      </section>

      {/* CTA — moved above problem */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Card className="rounded-[2.5rem] border-0 p-12 text-center gradient-brand text-white shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-display font-extrabold">
              Bạn cùng phòng lý tưởng chỉ cách bạn một bài trắc nghiệm.
            </h2>
            <p className="mt-4 text-white/90 max-w-xl mx-auto">
              Tham gia cùng 12.000+ sinh viên và người trẻ đã tìm thấy người hợp với mình.
            </p>
            <Link to="/register">
              <Button
                size="lg"
                className="mt-7 rounded-full bg-white text-navy hover:bg-white/90 px-8"
              >
                Bắt đầu — miễn phí
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="bg-muted/40 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <Badge variant="outline" className="rounded-full">
            Vấn đề
          </Badge>
          <h2 className="mt-4 text-4xl font-display font-bold">
            Tìm bạn cùng phòng thật sự <span className="text-destructive">mệt mỏi</span>.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Lướt group Facebook không hồi kết. Tin nhắn lạ. Bất ngờ gặp người hút thuốc. Giờ ngủ
            trái ngược. Chọn nhầm là cả năm bất an.
          </p>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {[
              { stat: "68%", text: "người thuê hối hận sau 3 tháng ở chung" },
              { stat: "42%", text: "nói sạch sẽ là nguyên nhân mâu thuẫn số 1" },
              { stat: "5h+", text: "mỗi tuần lướt group tìm phòng" },
            ].map((s) => (
              <Card key={s.stat} className="p-6 rounded-2xl border-0 shadow-sm text-left">
                <div className="text-4xl font-display font-extrabold text-gradient-brand">
                  {s.stat}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section id="how" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <Badge className="rounded-full bg-teal/15 text-teal border-0">
              Giải pháp của chúng tôi
            </Badge>
            <h2 className="mt-4 text-4xl font-display font-bold">
              Hợp tính cách, không chỉ hợp lịch trống.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Bài trắc nghiệm 60 giây + AI ghép đôi = bạn cùng phòng bạn thật sự muốn ở chung.
            </p>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {[
              {
                n: "01",
                t: "Tạo hồ sơ",
                d: "Cho chúng tôi biết giờ ngủ, mức độ sạch sẽ, phong cách xã hội và ngân sách của bạn.",
              },
              {
                n: "02",
                t: "Làm trắc nghiệm",
                d: "Tình huống tính cách giúp lộ ra cách bạn thực sự sống, không chỉ là điều bạn nói.",
              },
              {
                n: "03",
                t: "Nhận kết quả",
                d: "AI xếp hạng những người hợp gần bạn nhất và giải thích lý do hợp nhau.",
              },
            ].map((s) => (
              <Card
                key={s.n}
                className="p-7 rounded-3xl border-0 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="text-sm font-mono text-teal">{s.n}</div>
                <h3 className="mt-2 text-xl font-bold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 bg-gradient-to-b from-mint/10 to-transparent">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-4xl font-display font-bold">
              Mọi thứ bạn cần để tìm <span className="text-gradient-brand">người phù hợp</span>.
            </h2>
          </div>
          <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                i: Brain,
                t: "Điểm hợp nhau bằng AI",
                d: "Chấm điểm đa chiều trên 12 đặc điểm lối sống.",
              },
              {
                i: Shield,
                t: "Hồ sơ đã xác minh",
                d: "Xác minh CMND/CCCD và trường học để an toàn.",
              },
              {
                i: MessageCircle,
                t: "Trò chuyện trong ứng dụng",
                d: "Nhắn tin mà không cần đưa số điện thoại.",
              },
              {
                i: Heart,
                t: "Tình huống tính cách",
                d: "Trắc nghiệm thực tế giúp lộ ra điểm không hợp.",
              },
              {
                i: Home,
                t: "Dịch vụ gần nhà",
                d: "Nước, giặt ủi, ống nước — chỉ một chạm từ trang chính.",
              },
              {
                i: Sparkles,
                t: "Tăng độ hiển thị Premium",
                d: "Hiện lên đầu, mở khoá bộ lọc nâng cao và insights.",
              },
            ].map((f, i) => (
              <Card
                key={i}
                className="p-6 rounded-2xl border-0 shadow-sm hover:-translate-y-1 transition-transform"
              >
                <div className="h-11 w-11 rounded-xl gradient-brand grid place-items-center text-white">
                  <f.i className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display font-bold text-lg">{f.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PREMIUM */}
      <section id="premium" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-3">
          <Card className="order-2 rounded-[2rem] border border-teal/25 overflow-hidden shadow-2xl bg-gradient-to-b from-card to-mint/20">
            <div>
              <div className="p-8">
                <Badge className="rounded-full bg-teal/15 text-teal border-0">Premium</Badge>
                {/* <h2 className="mt-4 text-4xl font-display font-bold">Ghép thông minh hơn, dọn vào nhanh hơn.</h2> */}
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold">20.000₫</span>
                  <span className="text-muted-foreground">/ tháng</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Rẻ hơn ly cà phê. Đáng giá hơn nhiều.</p>
                <Link to="/premium"><Button size="lg" className="mt-7 w-full rounded-full bg-teal hover:bg-teal/90 text-white">Chọn gói tháng</Button></Link>
              </div>
              <div className="px-8 pb-8">
                <ul className="space-y-3">
                  {[
                    "Phân tích hợp nhau nâng cao",
                    "Quét hợp nhau không giới hạn",
                    "Bộ lọc nâng cao (ngân sách, khu vực, lối sống)",
                    "Hiển thị ưu tiên trong kết quả",
                    "Boost hồ sơ — xem nhiều hơn 5 lần",
                  ].map(b => (
                    <li key={b} className="flex items-start gap-3">
                      <div className="mt-0.5 h-5 w-5 rounded-full bg-mint grid place-items-center"><Check className="h-3 w-3 text-navy" /></div>
                      <span className="text-sm">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
            <Card className="order-1 rounded-[2rem] border border-mint/30 p-8 shadow-lg bg-gradient-to-b from-card to-mint/10">
              <div className="text-sm font-semibold text-muted-foreground">Free</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-display font-extrabold">0đ</span>
                <span className="text-muted-foreground">/ mãi mãi</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Bắt đầu ghép đôi và trò chuyện miễn phí.</p>
              <Link to="/register">
                <Button size="lg" variant="outline" className="mt-7 w-full rounded-full">Bắt đầu miễn phí</Button>
              </Link>
              <ul className="mt-7 space-y-3">
                {["Ghép đôi cơ bản", "Trò chuyện trong ứng dụng", "5 lượt quét/tháng", "Bộ lọc tiêu chuẩn"].map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-mint grid place-items-center"><Check className="h-3 w-3 text-navy" /></div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="order-3 rounded-[2rem] border border-teal/15 p-8 shadow-lg bg-gradient-to-b from-card to-teal/10 relative overflow-hidden">
              <Badge className="absolute right-6 top-6 rounded-full bg-mint/30 text-navy border-0">Tiết kiệm</Badge>
              <div className="text-sm font-semibold text-muted-foreground">Premium năm</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-display font-extrabold">180.000đ</span>
                <span className="text-muted-foreground">/ năm</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Tiết kiệm 60.000đ so với trả theo tháng.</p>
              <Link to="/premium">
                <Button size="lg" className="mt-7 w-full rounded-full bg-teal hover:bg-teal/90 text-white">Chọn gói năm</Button>
              </Link>
              <ul className="mt-7 space-y-3">
                {[
                  "Tất cả tính năng Premium tháng",
                  "Quét hợp nhau không giới hạn",
                  "Bộ lọc nâng cao theo khu vực và lối sống",
                  "Ưu tiên hiển thị cả năm",
                  "Boost hồ sơ định kỳ",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-mint grid place-items-center"><Check className="h-3 w-3 text-navy" /></div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
            <div>
              <Badge variant="outline" className="rounded-full">
                Dịch vụ gần nhà
              </Badge>
              <h2 className="mt-3 text-3xl font-display font-bold">Ổn định cuộc sống nhanh hơn.</h2>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Đặt dịch vụ địa phương đáng tin cậy ngay khi vừa dọn vào.
              </p>
            </div>
            <Link to="/services">
              <Button variant="outline" className="rounded-full">
                Xem tất cả <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { i: Droplet, t: "Giao nước" },
              { i: Shirt, t: "Giặt ủi" },
              { i: Wrench, t: "Sửa ống nước" },
              { i: Wifi, t: "Internet" },
            ].map((s, i) => (
              <Card
                key={i}
                className="p-6 rounded-2xl border-0 shadow-sm text-center hover:shadow-md transition-shadow"
              >
                <div className="mx-auto h-12 w-12 rounded-2xl bg-mint/40 grid place-items-center text-navy">
                  <s.i className="h-5 w-5" />
                </div>
                <div className="mt-3 font-semibold">{s.t}</div>
                <div className="text-xs text-muted-foreground mt-1">Từ 0,4 km</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-4xl font-display font-bold">12.000+ bạn cùng phòng đã tin dùng.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                n: "Anh T.",
                r: "Sinh viên, FTU",
                t: "Tìm được người ở chung sau 3 ngày. Ở với nhau 8 tháng — không một lần lục đục.",
                s: 5,
              },
              {
                n: "Phúc M.",
                r: "Kỹ sư phần mềm",
                t: "Phân tích hợp nhau chính xác đến đáng sợ. Đã cứu mình khỏi vài lần ghép nhầm.",
                s: 5,
              },
              {
                n: "Mai L.",
                r: "Thực tập sinh Marketing",
                t: "Ít mờ ám hơn group Facebook nhiều. Hồ sơ xác minh tạo cảm giác an tâm.",
                s: 5,
              },
            ].map((t, i) => (
              <Card key={i} className="p-7 rounded-3xl border-0 shadow-sm">
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: t.s }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-foreground/90">"{t.t}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <img
                    src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${t.n}&backgroundColor=8FD3C1`}
                    className="h-10 w-10 rounded-full"
                  />
                  <div>
                    <div className="font-semibold text-sm">{t.n}</div>
                    <div className="text-xs text-muted-foreground">{t.r}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-3xl font-display font-bold text-center">Câu hỏi thường gặp</h2>
          <Accordion type="single" collapsible className="mt-8">
            {[
              {
                q: "RoomieMatch có miễn phí không?",
                a: "Có — tính năng ghép đôi, trò chuyện và hồ sơ luôn miễn phí. Premium mở khoá bộ lọc nâng cao và hiển thị ưu tiên với giá 20.000₫/tháng hoặc 180.000₫/năm (tiết kiệm 25%).",
              },
              {
                q: "AI ghép đôi hoạt động ra sao?",
                a: "Chúng tôi chấm điểm tương thích trên 12 khía cạnh lối sống gồm giờ ngủ, sạch sẽ, phong cách xã hội, chịu ồn và ngân sách — rồi đề xuất những người hợp nhất.",
              },
              {
                q: "Hồ sơ có được xác minh không?",
                a: "Có. Mọi hồ sơ đều được xác minh qua số điện thoại, email và CMND/CCCD trường học (tuỳ chọn).",
              },
              {
                q: "Tôi có thể tìm ngoài TP.HCM không?",
                a: "Hiện tại chúng tôi ra mắt tại TP.HCM, Hà Nội và Đà Nẵng. Các thành phố khác sẽ có trong Q2/2026.",
              },
              {
                q: "Dữ liệu của tôi có an toàn không?",
                a: "Luôn an toàn. Chúng tôi không chia sẻ số điện thoại hay địa chỉ. Mọi trò chuyện diễn ra trong ứng dụng.",
              },
            ].map((f, i) => (
              <AccordionItem key={i} value={`i${i}`} className="border-b">
                <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground max-w-sm">
              Ghép bạn cùng phòng dựa trên sự tương thích cho sinh viên và người trẻ tại Việt Nam.
            </p>
          </div>
          {[
            { t: "Sản phẩm", l: ["Tính năng", "Premium", "Dịch vụ", "Bảng giá"] },
            { t: "Công ty", l: ["Về chúng tôi", "Tuyển dụng", "Liên hệ", "Bảo mật"] },
          ].map((c) => (
            <div key={c.t}>
              <div className="font-semibold text-sm">{c.t}</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {c.l.map((x) => (
                  <li key={x}>
                    <a className="hover:text-foreground" href="#">
                      {x}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-10 pt-6 border-t border-border/60 flex justify-between text-xs text-muted-foreground">
          <span>© 2026 RoomieMatch. Made in Vietnam.</span>
          <Link to="/community-guidelines" className="hover:text-foreground">Quy tắc cộng đồng</Link>
          <span>v2.0</span>
        </div>
      </footer>
    </div>
  );
}
