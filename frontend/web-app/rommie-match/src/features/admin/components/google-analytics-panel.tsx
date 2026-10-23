import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  ExternalLink,
  Eye,
  MousePointerClick,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuthStore } from "@/features/auth";
import { GA_MEASUREMENT_ID, GA_REPORT_URL } from "@/services/analytics";
import { ApiError } from "@/services/api-error";
import {
  analyticsReportApi,
  type AnalyticsRange,
  type AnalyticsReport,
  type AnalyticsSlice,
  type AnalyticsTotals,
} from "../services/analytics-report-api";

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: 7, label: "7 ngày" },
  { value: 28, label: "28 ngày" },
  { value: 90, label: "90 ngày" },
];

const LABELS: Record<string, string> = {
  desktop: "Máy tính",
  mobile: "Điện thoại",
  tablet: "Máy tính bảng",
  smart_tv: "Smart TV",
  Direct: "Truy cập trực tiếp",
  "Organic Search": "Tìm kiếm tự nhiên",
  "Paid Search": "Tìm kiếm trả phí",
  "Organic Social": "Mạng xã hội",
  "Paid Social": "Mạng xã hội trả phí",
  Referral: "Trang giới thiệu",
  Email: "Email",
  Unassigned: "Chưa phân loại",
  "(not set)": "Không xác định",
  "(other)": "Khác",
};

const chartConfig = {
  activeUsers: { label: "Người dùng", color: "#4f46e5" },
  newUsers: { label: "Người dùng mới", color: "#10b981" },
} satisfies ChartConfig;

const number = new Intl.NumberFormat("vi-VN");
const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
const duration = (seconds: number) =>
  seconds >= 60
    ? `${(seconds / 60).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} phút`
    : `${Math.round(seconds)} giây`;

export function GoogleAnalyticsPanel() {
  const [days, setDays] = useState<AnalyticsRange>(28);
  const userId = useAuthStore((state) => state.user?.id);
  const query = useQuery({
    queryKey: ["admin", "analytics", days, userId],
    queryFn: () => analyticsReportApi.report(days),
    // The API caches GA for 10 minutes; refreshing more often only re-reads that cache.
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: (count, error) => !(error instanceof ApiError && [403, 502, 503].includes(error.status)) && count < 2,
  });
  const report = query.data;

  return (
    <section aria-labelledby="analytics-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 id="analytics-title" className="font-display text-2xl font-bold">
            Google Analytics
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Theo dõi lượt truy cập và cách người dùng sử dụng RoomieMatch.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {report?.realtimeActiveUsers != null && (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
              <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              {number.format(report.realtimeActiveUsers)} người đang truy cập
            </span>
          )}
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={String(days)}
            onValueChange={(value) => value && setDays(Number(value) as AnalyticsRange)}
            aria-label="Khoảng thời gian"
          >
            {RANGES.map((range) => (
              <ToggleGroupItem key={range.value} value={String(range.value)} className="px-3">
                {range.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {query.isPending && <DashboardSkeleton />}
      {query.isError && <ReportError error={query.error} onRetry={() => void query.refetch()} />}
      {report && <Dashboard report={report} />}

      <Card className="mt-6 rounded-2xl border-slate-200 p-6 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <dl className="flex flex-wrap gap-x-10 gap-y-3 text-sm">
            <div><dt className="text-slate-500">Website</dt><dd className="font-medium">rommie-match.vercel.app</dd></div>
            <div><dt className="text-slate-500">Mã đo lường</dt><dd className="font-medium">{GA_MEASUREMENT_ID}</dd></div>
            {report && (
              <div>
                <dt className="text-slate-500">Cập nhật lúc</dt>
                <dd className="font-medium">{new Date(report.generatedAt).toLocaleTimeString("vi-VN")}</dd>
              </div>
            )}
          </dl>
          <Button asChild variant="outline">
            <a href={GA_REPORT_URL} target="_blank" rel="noopener noreferrer">
              Mở Google Analytics
              <ExternalLink aria-hidden="true" />
              <span className="sr-only"> (mở trong tab mới)</span>
            </a>
          </Button>
        </div>
        <p className="mt-4 max-w-prose text-xs leading-5 text-slate-500">
          Chỉ các trang công khai được ghi nhận; trang quản trị, trò chuyện và hồ sơ cá nhân không gửi
          về Google Analytics. Số liệu được làm mới khoảng 10 phút một lần.
        </p>
      </Card>
    </section>
  );
}

function Dashboard({ report }: { report: AnalyticsReport }) {
  const { current, previous } = report;
  const kpis: {
    label: string;
    key: keyof AnalyticsTotals;
    icon: typeof Users;
    format: (value: number) => string;
    color: string;
  }[] = [
    { label: "Người dùng", key: "activeUsers", icon: Users, format: number.format, color: "text-indigo-600 bg-indigo-50" },
    { label: "Người dùng mới", key: "newUsers", icon: UserPlus, format: number.format, color: "text-emerald-600 bg-emerald-50" },
    { label: "Lượt xem trang", key: "pageViews", icon: Eye, format: number.format, color: "text-sky-600 bg-sky-50" },
    {
      label: "Tỉ lệ tương tác",
      key: "engagementRate",
      icon: MousePointerClick,
      format: (value) => `${(value * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`,
      color: "text-amber-600 bg-amber-50",
    },
    { label: "Thời lượng phiên TB", key: "averageSessionSeconds", icon: Clock3, format: duration, color: "text-rose-600 bg-rose-50" },
  ];
  const empty = current.pageViews === 0 && current.activeUsers === 0;

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.key} className="rounded-2xl border-slate-200 p-5 shadow-none">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${kpi.color}`}>
              <kpi.icon aria-hidden="true" className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-semibold tabular-nums">{kpi.format(current[kpi.key])}</p>
            <p className="mt-1 text-sm text-slate-500">{kpi.label}</p>
            <Change current={current[kpi.key]} previous={previous[kpi.key]} days={report.days} />
          </Card>
        ))}
      </div>

      {empty && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Chưa có lượt truy cập nào trong {report.days} ngày qua. Dữ liệu chỉ được ghi nhận trên
          rommie-match.vercel.app và có thể mất vài giờ để xuất hiện trong báo cáo.
        </p>
      )}

      <Card className="mt-6 rounded-2xl border-slate-200 p-6 shadow-none">
        <h2 className="font-semibold">Người dùng theo ngày</h2>
        <ChartContainer config={chartConfig} className="mt-4 aspect-auto h-72 w-full">
          <AreaChart data={report.daily} margin={{ left: 0, right: 8, top: 8 }}>
            <defs>
              {(["activeUsers", "newUsers"] as const).map((key) => (
                <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={dayLabel} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
            <ChartTooltip
              content={<ChartTooltipContent indicator="line" labelFormatter={(value) => dayLabel(String(value))} />}
            />
            <Area dataKey="activeUsers" type="monotone" stroke="var(--color-activeUsers)" fill="url(#fill-activeUsers)" strokeWidth={2} />
            <Area dataKey="newUsers" type="monotone" stroke="var(--color-newUsers)" fill="url(#fill-newUsers)" strokeWidth={2} />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="rounded-2xl border-slate-200 p-6 shadow-none xl:col-span-2">
          <h2 className="font-semibold">Trang được xem nhiều</h2>
          {report.topPages.length === 0 ? (
            <EmptyNote />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th scope="col" className="py-2 pr-4 font-medium">Đường dẫn</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">Lượt xem</th>
                    <th scope="col" className="py-2 text-right font-medium">Người dùng</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topPages.map((page) => (
                    <tr key={page.path} className="border-b border-slate-100 last:border-0">
                      <td className="max-w-xs truncate py-2.5 pr-4 font-mono text-xs text-slate-700" title={page.path}>
                        {page.path}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{number.format(page.views)}</td>
                      <td className="py-2.5 text-right tabular-nums">{number.format(page.users)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Breakdown title="Thiết bị" unit="người dùng" slices={report.devices} color="bg-sky-500" />
        <Breakdown title="Nguồn truy cập" unit="phiên" slices={report.channels} color="bg-indigo-500" />
        <Breakdown title="Thành phố" unit="người dùng" slices={report.cities} color="bg-emerald-500" />
        <Card className="rounded-2xl border-slate-200 p-6 shadow-none">
          <h2 className="font-semibold">Phiên truy cập</h2>
          <p className="mt-4 text-3xl font-semibold tabular-nums">{number.format(current.sessions)}</p>
          <Change current={current.sessions} previous={previous.sessions} days={report.days} />
          <p className="mt-4 text-sm leading-6 text-slate-500">
            Trung bình {number.format(Math.round(current.pageViews / Math.max(current.sessions, 1) * 10) / 10)} trang
            mỗi phiên trong {report.days} ngày qua.
          </p>
        </Card>
      </div>
    </>
  );
}

function Change({ current, previous, days }: { current: number; previous: number; days: number }) {
  if (previous === 0) {
    return <p className="mt-2 text-xs text-slate-400">Chưa có dữ liệu kỳ trước</p>;
  }
  const change = ((current - previous) / previous) * 100;
  const up = change >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={`mt-2 inline-flex flex-wrap items-center gap-1 text-xs font-medium ${up ? "text-emerald-700" : "text-rose-700"}`}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {up ? "+" : ""}
      {change.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
      <span className="font-normal text-slate-500" title={`${days} ngày liền trước`}>so với kỳ trước</span>
    </p>
  );
}

function Breakdown({ title, unit, slices, color }: { title: string; unit: string; slices: AnalyticsSlice[]; color: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  return (
    <Card className="rounded-2xl border-slate-200 p-6 shadow-none">
      <h2 className="font-semibold">{title}</h2>
      {total === 0 ? (
        <EmptyNote />
      ) : (
        <ul className="mt-4 space-y-3">
          {slices.map((slice) => {
            const share = (slice.value / total) * 100;
            return (
              <li key={slice.label} className="text-sm">
                <div className="flex justify-between gap-3">
                  <span className="truncate">{LABELS[slice.label] ?? slice.label}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">
                    {number.format(slice.value)} {unit}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(share, 2)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function EmptyNote() {
  return <p className="mt-4 text-sm text-slate-500">Chưa có dữ liệu trong khoảng thời gian này.</p>;
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Đang tải báo cáo" className="mt-6 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-36 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="mt-6 h-80 rounded-2xl bg-slate-100" />
    </div>
  );
}

function ReportError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const code =
    error instanceof ApiError && typeof error.details === "object" && error.details !== null && "code" in error.details
      ? String(error.details.code)
      : undefined;

  if (code === "not_configured") {
    return (
      <Card className="mt-6 rounded-2xl border-amber-200 bg-amber-50/60 p-6 shadow-none">
        <h2 className="font-semibold text-amber-900">Chưa kết nối dữ liệu Google Analytics</h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-amber-900">
          Website đã gửi dữ liệu về GA4, nhưng máy chủ RoomieMatch chưa có quyền đọc báo cáo. Quản trị viên cần:
        </p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-amber-900">
          <li>Bật “Google Analytics Data API” trong Google Cloud và tạo service account kèm khoá JSON.</li>
          <li>Trong GA4, vào Quản trị → Quản lý quyền truy cập tài sản, thêm email service account với vai trò Người xem.</li>
          <li>Dán nội dung khoá JSON vào biến môi trường GoogleAnalytics__ServiceAccountJson của API rồi triển khai lại.</li>
        </ol>
      </Card>
    );
  }

  return (
    <div role="alert" className="mt-6 rounded-2xl border border-destructive/30 p-5 text-destructive">
      <p>{error.message || "Không thể tải báo cáo Google Analytics."}</p>
      {code === "permission_denied" && (
        <p className="mt-2 text-sm text-slate-600">
          Thêm email này vào GA4 (Quản trị → Quản lý quyền truy cập tài sản) với vai trò Người xem.
        </p>
      )}
      <Button variant="outline" className="mt-3" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        Thử lại
      </Button>
    </div>
  );
}
