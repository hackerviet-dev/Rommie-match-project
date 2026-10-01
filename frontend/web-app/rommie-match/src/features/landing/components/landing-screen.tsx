import "../landing.css";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as m from "motion/react-m";
import { Logo } from "@/layouts/main-layout";
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
  ArrowDown,
  Menu,
} from "lucide-react";
import { CompatRing } from "@/layouts/main-layout";

function Nav() {
  const headerRef = useRef<HTMLElement>(null);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let previousY = window.scrollY;
    const handleScroll = () => {
      const currentY = Math.max(0, Math.min(window.scrollY,
        document.documentElement.scrollHeight - window.innerHeight));
      const header = headerRef.current;
      if (currentY <= (header?.offsetHeight ?? 96) || header?.querySelector("details[open]")) {
        setIsHidden(false);
        previousY = currentY;
        return;
      }
      // Ignore tiny movements so the header doesn't flicker while scrolling.
      if (Math.abs(currentY - previousY) < 8) return;
      setIsHidden(currentY > previousY);
      previousY = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      ref={headerRef}
      data-hidden={isHidden}
      className="landing-nav sticky top-0 z-40 bg-card"
      onFocus={() => setIsHidden(false)}
    >
      <div className="landing-nav-inner mx-auto flex items-center justify-between px-4 sm:px-8">
        <Logo className="shrink-0 [&>span]:hidden min-[400px]:[&>span]:inline" />
        <nav aria-label="Giới thiệu RoomieMatch" className="hidden xl:flex items-center gap-7 text-base font-medium text-navy">
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
          <details className="landing-mobile-menu xl:hidden">
            <summary aria-label="Mở menu" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-navy"><Menu className="h-5 w-5" aria-hidden="true" /></summary>
            <nav
              aria-label="Menu giới thiệu"
              className="absolute left-4 right-4 top-full rounded-2xl border bg-card p-5 shadow-lg"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) {
                  event.currentTarget.closest("details")?.removeAttribute("open");
                }
              }}
            >
              <a href="#features">Tính năng</a>
              <a href="#how">Cách hoạt động</a>
              <a href="#premium">Premium</a>
              <Link to="/community-guidelines">Quy tắc cộng đồng</Link>
              <a href="#faq">Hỏi đáp</a>
            </nav>
          </details>
          <Button asChild variant="ghost" className="rounded-full px-2 sm:px-4">
            <Link to="/login">Đăng nhập</Link>
          </Button>
          <Button asChild className="rounded-full bg-navy hover:bg-navy/90 text-white px-3 sm:px-5">
            <Link to="/register">Đăng ký</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function LandingScreen() {
  return (
    <div className="landing-home min-h-screen bg-background">
      <Nav />

      {/* HERO */}
      <section className="landing-hero relative">
        <div className="landing-hero-inner mx-auto px-5 sm:px-8 text-center">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <Badge className="rounded-full bg-mint/30 text-navy border-0 hover:bg-mint/30 px-3 py-1.5">
              <Sparkles className="h-3 w-3 mr-1.5" /> Ghép đôi bằng AI · v2.0
            </Badge>
            <h1 className="landing-hero-title font-display font-extrabold text-navy text-balance">
              Tìm bạn cùng phòng&nbsp;thật sự{" "}
              <span className="text-gradient-brand">hợp với bạn</span>.
            </h1>
            <p className="landing-hero-description mx-auto text-muted-foreground">
              RoomieMatch dùng dữ liệu lối sống, tính cách và thói quen để ghép sinh viên và người
              trẻ với bạn cùng phòng thực sự phù hợp — không chỉ là người có phòng trống.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
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
            <div className="mt-10 flex flex-wrap justify-center items-center gap-3 sm:gap-6 text-sm text-muted-foreground">
              <div className="flex shrink-0 -space-x-2">
                {["A", "B", "C", "D"].map((s) => (
                  <img
                    key={s}
                    alt="Ảnh đại diện minh họa thành viên"
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

          <a href="#features" className="landing-discover mt-12 inline-flex flex-col items-center gap-3 text-sm font-medium text-navy">
            Khám phá RoomieMatch <ArrowDown className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="landing-features">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-4xl font-display font-bold">
              Mọi thứ bạn cần để tìm <span className="text-gradient-brand">người phù hợp</span>.
            </h2>
          </div>
          <div className="mt-12 grid md:grid-cols-2 xl:grid-cols-3 gap-5">
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
                className={`landing-feature-card landing-feature-tone-${i % 3} p-7 sm:p-9 border-0 transition-transform hover:-translate-y-1`}
              >
                <h3 className="font-display font-bold">{f.t}</h3>
                <div className="landing-feature-art" aria-hidden="true"><f.i strokeWidth={1.3} /></div>
                <p className="mt-auto text-base leading-relaxed">{f.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="landing-problem">
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
      <section id="how" className="landing-how">
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
          <div className="landing-how-content">
          <div className="landing-how-steps">
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
          <m.div
            className="landing-match-preview relative"
            initial={{ opacity: 0, x: 28, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.08 }}
          >
            <div className="absolute -inset-6 gradient-brand opacity-10 rounded-[3rem] blur-2xl" />
            <Card className="relative p-6 sm:p-8 rounded-2xl shadow-2xl border-0 bg-card text-foreground">
              <div className="flex items-center gap-4">
                <img
                  alt="Ảnh đại diện minh họa Nguyễn Linh"
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
            <Card className="absolute -bottom-6 -left-6 hidden sm:block p-3 pr-4 rounded-2xl shadow-xl border-0 bg-card text-foreground">
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
        </div>
      </section>

      {/* PREMIUM */}
      <section id="premium" className="landing-premium">
        <div className="landing-section-heading mx-auto max-w-7xl px-4 sm:px-6"><h2 className="font-display font-bold">Premium</h2></div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              {
                name: "Free", price: "0đ", period: "/ mãi mãi", icon: Home,
                description: "Bắt đầu ghép đôi và trò chuyện miễn phí.",
                action: "Bắt đầu miễn phí", to: "/register", premium: false,
                features: ["Ghép đôi cơ bản", "Trò chuyện trong ứng dụng", "5 lượt quét/tháng", "Bộ lọc tiêu chuẩn"],
              },
              {
                name: "Premium", price: "20.000₫", period: "/ tháng", icon: Sparkles,
                description: "Rẻ hơn ly cà phê. Đáng giá hơn nhiều.",
                action: "Chọn gói tháng", to: "/premium", premium: true,
                features: ["Phân tích hợp nhau nâng cao", "Quét hợp nhau không giới hạn", "Bộ lọc nâng cao (ngân sách, khu vực, lối sống)", "Hiển thị ưu tiên trong kết quả", "Boost hồ sơ — xem nhiều hơn 5 lần"],
              },
              {
                name: "Premium năm", price: "180.000đ", period: "/ năm", icon: Star,
                description: "Tiết kiệm 60.000đ so với trả theo tháng.",
                action: "Chọn gói năm", to: "/premium", premium: true,
                features: ["Tất cả tính năng Premium tháng", "Quét hợp nhau không giới hạn", "Bộ lọc nâng cao theo khu vực và lối sống", "Ưu tiên hiển thị cả năm", "Boost hồ sơ định kỳ"],
              },
            ].map((plan) => (
              <Card key={plan.name} className="landing-plan-card" data-featured={plan.name === "Premium"}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-navy">{plan.name}</h3>
                    {plan.name === "Premium năm" && <Badge className="rounded-full bg-mint/40 text-navy border-0">Tiết kiệm</Badge>}
                  </div>
                  <div className="landing-plan-icon" aria-hidden="true"><plan.icon className="h-6 w-6" /></div>
                </div>
                <div className="mt-5 flex flex-wrap items-baseline gap-2">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="landing-plan-description mt-3 text-sm text-muted-foreground">{plan.description}</p>
                <ul className="landing-plan-features">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-mint grid place-items-center"><Check className="h-3 w-3 text-navy" /></div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild size="lg" variant={plan.premium ? "default" : "outline"} className={plan.premium ? "mt-6 w-full rounded-full bg-teal hover:bg-teal/90 text-white" : "mt-6 w-full rounded-full"}>
                  <Link to={plan.to}>{plan.action}</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="landing-services">
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
      <section className="landing-testimonials">
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
                    alt={`Ảnh đại diện minh họa ${t.n}`}
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
      <section id="faq" className="landing-faq">
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

      {/* CTA */}
      <section className="landing-cta">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Card className="rounded-[2.5rem] border-0 p-6 sm:p-12 text-center gradient-brand text-white shadow-2xl">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold">
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

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-footer-links mx-auto max-w-7xl px-4 sm:px-6 grid gap-8">
          <div>
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
                    <a className="hover:text-mint" href={({ "Tính năng": "#features", Premium: "#premium", "Dịch vụ": "/services", "Bảng giá": "#premium" } as Record<string, string>)[x] ?? "#"}>
                      {x}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <div className="font-semibold text-sm">Khám phá</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#how" className="hover:text-mint">Cách hoạt động</a></li>
              <li><a href="#faq" className="hover:text-mint">Hỏi đáp</a></li>
              <li><Link to="/community-guidelines" className="hover:text-mint">Quy tắc cộng đồng</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-10 pt-6 border-t border-border/60 flex justify-between text-xs text-muted-foreground">
          <span>© 2026 RoomieMatch. Made in Vietnam.</span>
          <Link to="/community-guidelines" className="hover:text-foreground">Quy tắc cộng đồng</Link>
          <span>v2.0</span>
        </div>
        <div className="landing-wordmark" aria-hidden="true">RoomieMatch</div>
      </footer>
    </div>
  );
}
