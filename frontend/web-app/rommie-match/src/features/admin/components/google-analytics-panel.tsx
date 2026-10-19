import { ChartNoAxesCombined, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GA_MEASUREMENT_ID, GA_REPORT_URL } from "@/services/analytics";

export function GoogleAnalyticsPanel() {
  return (
    <section aria-labelledby="analytics-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 id="analytics-title" className="font-display text-2xl font-bold">
            Google Analytics
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Theo dõi lượt truy cập và cách người dùng sử dụng RoomieMatch.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800">
          Đã tạo tài sản GA4
        </span>
      </div>

      <Card className="mt-6 rounded-2xl border-slate-200 p-6 shadow-none sm:p-8">
        <div className="flex max-w-3xl flex-col items-start gap-5 sm:flex-row">
          <ChartNoAxesCombined aria-hidden="true" className="h-10 w-10 shrink-0 text-indigo-600" />
          <div>
            <h2 className="text-lg font-semibold">Báo cáo truy cập RoomieMatch</h2>
            <p className="mt-2 max-w-prose text-sm leading-6 text-slate-600">
              Xem số người truy cập, lượt xem trang và mức độ tương tác trong Google Analytics.
              Đăng nhập bằng tài khoản Google có quyền xem tài sản RoomieMatch.
            </p>
            <Button asChild variant="outline" className="mt-5">
              <a href={GA_REPORT_URL} target="_blank" rel="noopener noreferrer">
                Xem báo cáo Google Analytics
                <ExternalLink aria-hidden="true" />
                <span className="sr-only"> (mở trong tab mới)</span>
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="font-semibold">Thông tin kết nối</h2>
          <dl className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <div><dt className="font-medium text-slate-800">Website</dt><dd>rommie-match.vercel.app</dd></div>
            <div><dt className="font-medium text-slate-800">Mã đo lường</dt><dd>{GA_MEASUREMENT_ID}</dd></div>
          </dl>
          <p className="mt-5 max-w-prose text-sm leading-6 text-slate-600">
            Dữ liệu bắt đầu được ghi nhận sau khi bản tích hợp được triển khai lên website.
            Quyền moderator trong RoomieMatch và quyền xem Google Analytics được cấp riêng.
          </p>
        </div>
      </Card>
    </section>
  );
}
