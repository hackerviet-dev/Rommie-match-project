import { apiClient } from "@/services/api-client";

export type AnalyticsRange = 7 | 28 | 90;
export type AnalyticsTotals = {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  pageViews: number;
  averageSessionSeconds: number;
  engagementRate: number;
};
export type AnalyticsSlice = { label: string; value: number };
export type AnalyticsReport = {
  days: AnalyticsRange;
  generatedAt: string;
  realtimeActiveUsers: number | null;
  current: AnalyticsTotals;
  previous: AnalyticsTotals;
  daily: { date: string; activeUsers: number; newUsers: number; pageViews: number }[];
  topPages: { path: string; views: number; users: number }[];
  channels: AnalyticsSlice[];
  devices: AnalyticsSlice[];
  cities: AnalyticsSlice[];
};

export const analyticsReportApi = {
  report: (days: AnalyticsRange) =>
    apiClient<AnalyticsReport>(`/api/admin/analytics/report?days=${days}`, { authenticated: true }),
};
