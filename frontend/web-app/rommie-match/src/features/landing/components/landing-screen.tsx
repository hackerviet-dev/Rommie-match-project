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
  ArrowRight,
  Droplet,
  Shirt,
  Wrench,
  Wifi,
  ArrowDown,
  Menu,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/features/billing";
import { QueryState } from "@/components/common/query-state";

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
  const plans = useQuery({ queryKey: ["billing", "plans"], queryFn: billingApi.plans });
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
              <Sparkles className="h-3 w-3 mr-1.5" /> Ghép đôi theo lối sống
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
            <p className="mt-10 text-sm text-muted-foreground">
              Hoàn thiện hồ sơ để khám phá những người có lối sống phù hợp.
            </p>
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
                t: "Điểm tương thích lối sống",
                d: "So sánh thói quen sinh hoạt và câu trả lời khảo sát.",
              },
              {
                i: Shield,
                t: "Hồ sơ đã xác minh",
                d: "Trạng thái xác minh hiển thị khi yêu cầu được kiểm duyệt.",
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
                d: "Xem quyền lợi hiện tại của từng gói trong bảng giá.",
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
              { stat: "Giờ giấc", text: "Trao đổi về giờ ngủ và thời gian sinh hoạt chung." },
              { stat: "Việc nhà", text: "Thống nhất mức sạch sẽ và cách chia việc nhà." },
              { stat: "Chi phí", text: "Làm rõ tiền thuê, tiền cọc và các khoản dùng chung." },
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
              Hồ sơ và khảo sát lối sống giúp bạn hiểu thêm về người ở ghép.
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
                d: "Xem điểm tương thích được tính từ hồ sơ và câu trả lời khảo sát.",
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
                <div className="h-16 w-16 rounded-2xl bg-mint/30 grid place-items-center"><Heart className="h-8 w-8 text-teal" /></div>
                <div><h3 className="font-display font-bold text-lg">Hiểu nhau trước khi ở chung</h3><p className="text-sm text-muted-foreground">Những điều nên trao đổi</p></div>
              </div>
              <div className="mt-5 space-y-3">
                {["Giờ ngủ và mức chịu ồn", "Sạch sẽ và chia việc nhà", "Khách đến chơi và thú cưng", "Ngân sách và chia chi phí"].map((label) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl bg-muted p-3 text-sm"><Check className="h-4 w-4 text-teal" />{label}</div>
                ))}
              </div>
              <Button asChild className="mt-5 w-full rounded-full bg-teal hover:bg-teal/90 text-white"><Link to="/matches">Khám phá ở ghép <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </Card>
          </m.div>
          </div>
        </div>
      </section>

      {/* PREMIUM */}
      <section id="premium" className="landing-premium">
        <div className="landing-section-heading mx-auto max-w-7xl px-4 sm:px-6"><h2 className="font-display font-bold">Premium</h2></div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <QueryState query={plans} />
          {plans.isSuccess && plans.data.length === 0 && <p className="py-6 text-muted-foreground">Chưa có gói được công bố.</p>}
          <div className="grid gap-5 lg:grid-cols-3">
            {plans.data?.map((plan) => (
              <Card key={plan.code} className="landing-plan-card" data-featured={plan.tier === "premium"}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-navy">{plan.name}</h3>
                  <div className="landing-plan-icon" aria-hidden="true"><Sparkles className="h-6 w-6" /></div>
                </div>
                <div className="mt-5 flex flex-wrap items-baseline gap-2">
                  <span className="text-4xl font-extrabold">{plan.price.toLocaleString("vi-VN")} {plan.currency}</span>
                  {plan.durationMonths > 0 && <span className="text-muted-foreground">/ {plan.durationMonths} tháng</span>}
                </div>
                <ul className="mt-6 space-y-2 text-sm text-muted-foreground">{plan.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />{feature}</li>)}</ul>
                <Button asChild className="mt-6 w-full rounded-full bg-navy hover:bg-navy/90 text-white"><Link to={plan.tier === "premium" ? "/premium" : "/register"}>Xem gói {plan.name}</Link></Button>
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
                <div className="text-xs text-muted-foreground mt-1">Khám phá dịch vụ</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* COMMUNITY GUIDANCE */}
      <section className="landing-testimonials">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12"><h2 className="text-4xl font-display font-bold">Chủ động trước khi quyết định ở chung.</h2></div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { title: "Tìm hiểu hồ sơ", text: "Đọc thông tin và thói quen sinh hoạt, sau đó trao đổi trực tiếp.", to: "/matches", action: "Khám phá ở ghép" },
              { title: "Xem phòng thực tế", text: "Kiểm tra địa chỉ, chi phí và điều kiện thuê trước khi đặt cọc.", to: "/rooms", action: "Tìm phòng" },
              { title: "Bảo vệ cộng đồng", text: "Đọc quy tắc và báo cáo hồ sơ hoặc tin đăng có dấu hiệu vi phạm.", to: "/community-guidelines", action: "Đọc quy tắc" },
            ].map((item) => <Card key={item.title} className="p-7 rounded-3xl border-0 shadow-sm"><Shield className="h-6 w-6 text-teal" /><h3 className="mt-4 font-semibold">{item.title}</h3><p className="mt-3 text-muted-foreground">{item.text}</p><Link to={item.to} className="mt-5 inline-block text-teal">{item.action} →</Link></Card>)}
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
                a: "Xem giá và quyền lợi được công bố trong bảng gói phía trên hoặc trang Premium.",
              },
              {
                q: "Điểm ghép đôi được tính như thế nào?",
                a: "Hệ thống so sánh thông tin lối sống và khảo sát của hai hồ sơ để tính điểm tương thích. Điểm này hỗ trợ tìm hiểu, không thay thế việc trao đổi trực tiếp.",
              },
              {
                q: "Hồ sơ có được xác minh không?",
                a: "Hồ sơ chỉ có trạng thái đã xác minh sau khi yêu cầu được đội kiểm duyệt chấp thuận.",
              },
              {
                q: "Tôi có thể tìm ngoài TP.HCM không?",
                a: "Bạn có thể chọn thành phố khi tìm kiếm. Kết quả phụ thuộc vào hồ sơ và tin đăng hiện có tại khu vực đó.",
              },
              {
                q: "Dữ liệu của tôi có an toàn không?",
                a: "Bạn có thể nhắn tin trong ứng dụng, chặn và báo cáo người dùng. Hãy cân nhắc trước khi chia sẻ thông tin cá nhân hoặc chuyển tiền.",
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
              Tạo hồ sơ, chia sẻ thói quen và bắt đầu tìm người ở ghép phù hợp.
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
