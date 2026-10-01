# Trạng thái dự án RoomieMatch

- Cập nhật: **2026-10-01**
- Phiên bản tài liệu: **1.2**
- Branch/commit kiểm tra: **Duy-feature/landing-page-fe / 816fa43**
- Giai đoạn hiện tại: **MVP - nối frontend với backend và hoàn thiện các luồng cốt lõi**
- Mức bao phủ kỹ thuật: **62%**

> Phần trăm tính theo bốn lớp backend, database, frontend và verification; done = 1, partial = 0.5, planned/blocked = 0, bỏ qua na. Đây không phải phần trăm thời gian hoặc ngân sách.

## Actor

| Mã | Actor | Mục tiêu | Hiện trạng | Trạng thái |
| --- | --- | --- | --- | --- |
| G | Khách | Xem nội dung công khai và tạo phiên đăng nhập | Form đăng ký/đăng nhập web đã nối Auth API; phiên được kiểm tra qua /me và tự refresh; chưa có Google OAuth. | Một phần |
| M | Thành viên | Quản lý hồ sơ, phòng, ghép đôi, chat và an toàn | Backend có hồ sơ, phòng, quiz, matching, chat, booking và billing; frontend phần lớn còn mock/local state | Một phần |
| P | Premium | Thanh toán và nhận quyền lợi Premium được backend thực thi | Backend đã thực thi hạn mức quét, bộ lọc nâng cao và Boost; thanh toán vẫn dùng mock gateway | Một phần |
| MOD | Kiểm duyệt viên | Duyệt xác minh, báo cáo và nội dung | Có API duyệt báo cáo, xác minh và CRUD dịch vụ; chưa có giao diện moderation nối API | Một phần |
| A | Quản trị viên | Quản lý tài khoản, dịch vụ, báo cáo và dashboard | Có API thống kê, báo cáo, xác minh và quản lý dịch vụ; dashboard frontend vẫn dùng dữ liệu mẫu | Một phần |
| SYS | Hệ thống | Điều phối API, dữ liệu, matching, chat và phân quyền | .NET API đã chứa SignalR chat; PostgreSQL có migration tự động; Docker build và smoke test đạt | Một phần |
| PAY | Cổng thanh toán | Xử lý và đối soát thanh toán thật | Đang dùng mock gateway có checkout và hoàn tiền 7 ngày; chưa tích hợp VNPay/MoMo | Đang bị chặn |

## Tiến độ năng lực

| Mã | Năng lực | Backend | DB | Frontend | Kiểm tra | Tổng thể | Việc tiếp theo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CAP-01 | Hạ tầng Docker | Hoàn thành | Hoàn thành | Hoàn thành | Hoàn thành | Hoàn thành | Theo dõi CI và cấu hình production |
| CAP-02 | Đăng ký và đăng nhập | Hoàn thành | Hoàn thành | Hoàn thành | Một phần | Một phần | Kiểm thử tương tác trình duyệt và nhiều tab; Google OAuth là luồng riêng chưa triển khai. |
| CAP-03 | Hồ sơ cá nhân | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối Profile page và Settings với profileApi |
| CAP-04 | Sở thích lối sống | Hoàn thành | Hoàn thành | Một phần | Dự kiến | Một phần | Nối onboarding với lifestyleApi và thêm kiểm thử lưu dữ liệu |
| CAP-05 | Phòng | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối danh sách, chi tiết và form phòng với roomsApi |
| CAP-06 | Trắc nghiệm | Hoàn thành | Hoàn thành | Hoàn thành | Một phần | Một phần | Nối quiz UI với API và thêm kiểm thử chấm trait |
| CAP-07 | Ghép đôi | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối matchingApi và kiểm thử công thức/xếp hạng |
| CAP-08 | Lưu hồ sơ | Dự kiến | Hoàn thành | Một phần | Dự kiến | Một phần | Tạo REST API lưu/bỏ lưu và thay localStorage |
| CAP-09 | Chat realtime | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối frontend bằng SignalR client và kiểm thử realtime nhiều người dùng |
| CAP-10 | An toàn cộng đồng | Một phần | Hoàn thành | Một phần | Dự kiến | Một phần | Tạo member APIs cho block/report và nối moderation UI |
| CAP-11 | Thanh toán | Một phần | Hoàn thành | Một phần | Một phần | Một phần | Nối Premium result/refund UI; sau đó chọn VNPay/MoMo |
| CAP-12 | Quyền Premium | Một phần | Hoàn thành | Một phần | Một phần | Một phần | Nối entitlement UI và kiểm thử giới hạn Free/Premium |
| CAP-13 | Dịch vụ gần nhà | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối trang dịch vụ và lịch đặt với hyperlocalApi |
| CAP-14 | eKYC | Một phần | Hoàn thành | Dự kiến | Dự kiến | Một phần | Tạo luồng submit/status và chốt nhà cung cấp, chính sách dữ liệu |
| CAP-15 | Quản trị | Một phần | Hoàn thành | Một phần | Dự kiến | Một phần | Nối dashboard/moderation frontend và bổ sung quản lý tài khoản |
| CAP-16 | Thông báo và cài đặt | Dự kiến | Hoàn thành | Một phần | Dự kiến | Một phần | Tạo preferences API và nối Settings page |
| CAP-17 | Trợ lý AI | Dự kiến | Dự kiến | Một phần | Dự kiến | Dự kiến | Chốt use case, model, dữ liệu và ngân sách |

## Bằng chứng kiểm tra

- **CAP-01 - Hạ tầng Docker:** Compose chạy PostgreSQL, migration, .NET API gồm SignalR chat và web; build/smoke test đạt
- **CAP-02 - Đăng ký và đăng nhập:** Form web gọi register/login thật, React Hook Form + Zod; lưu JWT/refresh token; khôi phục /me; refresh tự động có single-flight; logout và logout-all gọi backend; route thành viên có kiểm tra phiên. Lint/typecheck/build đạt; smoke API thật kiểm tra đăng ký, login sai/đúng, /me, refresh đồng thời, logout và logout-all; chưa kiểm thử UI trình duyệt.
- **CAP-03 - Hồ sơ cá nhân:** GET/PUT profile và profile list có phân quyền; smoke test hồ sơ đạt
- **CAP-04 - Sở thích lối sống:** GET/PUT lifestyle đã có; onboarding chưa lưu server
- **CAP-05 - Phòng:** Rooms list/detail/CRUD, bộ lọc và soft delete đã có; API danh sách đã smoke test
- **CAP-06 - Trắc nghiệm:** Quiz definition, GET/PUT kết quả và quiz_responses đã có; submit smoke test đạt
- **CAP-07 - Ghép đôi:** Matching có điểm chi tiết, quota, filter và boost; list/usage đã smoke test
- **CAP-08 - Lưu hồ sơ:** Đã có bảng saved_profiles; frontend vẫn dùng localStorage và chưa có REST API
- **CAP-09 - Chat realtime:** SignalR có JWT, nhóm user/conversation, REST history, read receipt và lưu PostgreSQL; REST start chat đã smoke test
- **CAP-10 - An toàn cộng đồng:** Có bảng blocks/reports và API admin duyệt report; chưa có API thành viên gửi report/chặn
- **CAP-11 - Thanh toán:** Checkout mock, lịch sử, callback idempotent và hoàn tiền 7 ngày đã có; smoke test paid/refunded đạt
- **CAP-12 - Quyền Premium:** Backend đã enforce scan quota, advanced filters và Boost; usage endpoint đã smoke test
- **CAP-13 - Dịch vụ gần nhà:** List/detail/filter/CRUD và booking/cancel đã có; smoke test booking đạt
- **CAP-14 - eKYC:** Có bảng verification và API admin duyệt; chưa có API người dùng nộp hồ sơ hoặc nhà cung cấp eKYC
- **CAP-15 - Quản trị:** Có API stats, report queue, verification queue và CRUD dịch vụ; admin smoke test đạt
- **CAP-16 - Thông báo và cài đặt:** Đã có bảng user_settings; notification/settings UI vẫn dùng fixtures và chưa có API
- **CAP-17 - Trợ lý AI:** Mascot hoạt động nhưng reply theo từ khóa tại frontend

## Roadmap

| Giai đoạn | Tên | Mục tiêu | Trạng thái |
| --- | --- | --- | --- |
| P0 | Nền tảng | Docker, PostgreSQL, API modules và cấu trúc frontend | Hoàn thành |
| P1 | MVP tích hợp | Nối Auth, Profile, Lifestyle, Rooms, Matching và Hyperlocal vào frontend | Một phần |
| P2 | Tin cậy và giao tiếp | Chat an toàn, lịch sử, lưu hồ sơ, chặn và báo cáo | Một phần |
| P3 | Doanh thu và xác minh | Cổng thanh toán thật, Premium enforcement và eKYC | Một phần |
| P4 | Mở rộng | Admin hoàn chỉnh, B2B chủ trọ, Hyperlocal giao dịch và AI | Một phần |

## Lịch sử cập nhật

- **2026-10-01 - v1.2:** Nối Auth web với register/login/me/refresh/logout/logout-all; loại bỏ phiên mock, thêm validation/loading/error và vô hiệu hóa nút Google chưa hỗ trợ. Kiểm tra API thật, lint, typecheck và build; còn kiểm thử UI trình duyệt.
- **2026-09-30 - v1.2:** Đồng bộ tiến độ sau khi thêm quiz, SignalR chat, Premium enforcement, booking/refund, moderation và migration tự động.
- **2026-09-29 - v1.2:** Tạo dashboard tiến độ, ma trận 17 năng lực, roadmap và quy tắc cập nhật tài liệu sống.
- **2026-09-29 - v1.1:** Bổ sung định vị, roadmap, Premium, eKYC, AI, GTM và danh sách quyết định mở.

## Cách cập nhật

1. Cập nhật JSON nguồn sau khi trạng thái triển khai thay đổi.
2. Chạy `scripts/sync-project-status.py` bằng Python có reportlab và pypdf.
3. Kiểm tra JSON, Markdown và render dashboard PDF.
