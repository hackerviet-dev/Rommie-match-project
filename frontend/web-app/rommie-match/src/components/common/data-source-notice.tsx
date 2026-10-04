import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Database, FlaskConical } from "lucide-react";
import { billingApi } from "@/features/billing";

// Source labels describe how this screen obtains data, not whether every DB row
// belongs to a real customer. Local seed/demo records also travel through APIs.
export function DataSourceNotice() {
  const { pathname, search } = useLocation();
  const isLanding = pathname === "/";
  const isStatic = isLanding || pathname === "/community-guidelines";
  const isAuth = pathname === "/login" || pathname === "/register";
  const isBilling = pathname.startsWith("/premium") || pathname.startsWith("/payments/") || pathname === "/admin/refunds" ||
    (pathname === "/settings" && new URLSearchParams(search).get("section") === "billing");
  const gateway = useQuery({ queryKey: ["billing", "health"], queryFn: billingApi.health, enabled: isBilling, retry: false, staleTime: 30000 });
  const hasMock = isLanding || (isBilling && gateway.data?.provider === "mock");
  const Icon = hasMock ? FlaskConical : Database;
  return <details className={`mb-4 rounded-xl border px-3 py-2 text-xs ${hasMock ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-white/80 text-slate-600"}`}>
    <summary className="cursor-pointer list-none"><span className="inline-flex items-center gap-2"><Icon className="h-3.5 w-3.5" /><span className="font-medium">Nguồn dữ liệu: {isLanding ? "Mock / minh họa" : hasMock ? "API + cổng thanh toán Mock" : isStatic ? "Nội dung tĩnh" : "API backend"}</span><span className="text-[10px] opacity-70">· Chi tiết</span></span></summary>
    <div className="mt-2 space-y-1 border-t border-current/10 pt-2 leading-5">
      <p>Trang: {pathname}</p>
      <p>{isLanding ? "Điểm ghép, số người dùng, lời chứng thực, khoảng cách và giá giới thiệu là dữ liệu minh họa, không lấy từ database." : isStatic ? "Tài liệu hướng dẫn được viết sẵn, không phải dữ liệu giao dịch." : "Dữ liệu nghiệp vụ được đọc/lưu qua API backend. Database local có thể chứa bản ghi seed/demo; gọi API không đồng nghĩa mọi bản ghi là dữ liệu khách hàng thực tế."}</p>
      {isAuth && <p>Ảnh đại diện bên cạnh form là minh họa. Đăng ký/đăng nhập sử dụng Auth API.</p>}
      {isBilling && <p>{gateway.isError ? "Chưa xác định được cổng thanh toán: API kiểm tra cổng đang lỗi." : gateway.isPending ? "Đang kiểm tra chế độ cổng thanh toán…" : gateway.data?.provider === "mock" ? "Cổng hiện tại là Mock: không thu/chuyển tiền thật. Bản ghi giao dịch vẫn được lưu trong database." : gateway.data?.provider === "payos" ? "Cổng hiện tại là payOS; nhãn này không xác nhận một giao dịch đã thanh toán thành công." : "Chưa cấu hình cổng thanh toán."}</p>}
      {pathname === "/settings" && <p>Một số tùy chọn cài đặt chưa có API; điều khiển chưa hỗ trợ được ghi chú riêng.</p>}
    </div>
  </details>;
}
