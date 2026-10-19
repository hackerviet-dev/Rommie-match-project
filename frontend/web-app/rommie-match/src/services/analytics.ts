export const GA_MEASUREMENT_ID = "G-0T70YWM8D8";
export const GA_REPORT_URL = "https://analytics.google.com/analytics/web/#/a409108259p559419688/reports/intelligenthome";
const PRODUCTION_HOST = "rommie-match.vercel.app";

type AnalyticsWindow = Window & { dataLayer?: unknown[] };
let lastPath: string | undefined;
let lastVisitedPath: string | undefined;

export function trackPageView(pathname: string) {
  if (!import.meta.env.PROD || window.location.hostname !== PRODUCTION_HOST) return;
  // Keep staff activity and private conversation/account URLs out of Analytics.
  if (/^\/(admin|moderator|chat|profile|settings|groups|disputes)(\/|$)/.test(pathname)) {
    lastPath = undefined;
    lastVisitedPath = undefined;
    return;
  }
  const path = pathname.replace(/\/[^/]+(?=\/|$)/g, (segment) =>
    /^\/(?:[0-9a-f]{8}-[0-9a-f-]{27}|\d+)$/i.test(segment) ? "/:id" : segment,
  );
  if (lastVisitedPath === pathname) return;
  const analyticsWindow = window as AnalyticsWindow;
  const dataLayer = analyticsWindow.dataLayer ??= [];
  // gtag reads arguments objects from dataLayer, rather than plain arrays.
  function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params -- Google's queue expects an arguments object.
    dataLayer.push(arguments);
  }
  if (!document.getElementById("google-analytics-tag")) {
    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: `https://${PRODUCTION_HOST}${path}`,
      page_referrer: "",
    });
    const script = document.createElement("script");
    script.id = "google-analytics-tag";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }
  gtag("event", "page_view", {
    page_location: `https://${PRODUCTION_HOST}${path}`,
    page_title: "RoomieMatch",
    page_referrer: lastPath ? `https://${PRODUCTION_HOST}${lastPath}` : "",
  });
  lastPath = path;
  lastVisitedPath = pathname;
}
