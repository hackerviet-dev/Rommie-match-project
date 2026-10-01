# Trạng thái dự án RoomieMatch

- Cập nhật: **2026-10-01**
- Phiên bản tài liệu: **1.2**
- Branch/commit kiểm tra: **Bao-Branch + main / 4b635d7 + c2fcdaa (integration)**
- Giai đoạn hiện tại: **MVP - nối frontend với backend và hoàn thiện các luồng cốt lõi**
- Mức bao phủ kỹ thuật: **62%**

> Phần trăm được tính trên bốn lớp backend, database, frontend và verification. Đây không phải phần trăm thời gian hoặc ngân sách đã sử dụng.

## Actor

| Mã | Actor | Mục tiêu | Hiện trạng | Trạng thái |
| --- | --- | --- | --- | --- |
| G | Khách | Xem nội dung công khai và tạo phiên đăng nhập | Form đăng ký/đăng nhập gọi Auth API, token sessionStorage; chưa tự động refresh | Một phần |
| M | Thành viên | Quản lý hồ sơ, phòng, ghép đôi, chat và an toàn | Backend có hồ sơ, phòng, quiz, matching, chat, booking và billing; frontend phần lớn còn mock/local state | Một phần |
| P | Premium | Thanh toán và nhận quyền lợi Premium được backend thực thi | Có payOS và frontend checkout/result; chưa bật thanh toán production | Một phần |
| MOD | Kiểm duyệt viên | Duyệt xác minh, báo cáo và nội dung | Có API duyệt báo cáo, xác minh và CRUD dịch vụ; chưa có giao diện moderation nối API | Một phần |
| A | Quản trị viên | Quản lý tài khoản, dịch vụ, báo cáo và dashboard | Có API thống kê, báo cáo, xác minh và quản lý dịch vụ; dashboard frontend vẫn dùng dữ liệu mẫu | Một phần |
| SYS | Hệ thống | Điều phối API, dữ liệu, matching, chat và phân quyền | .NET API đã chứa SignalR chat; PostgreSQL có migration tự động; Docker build và smoke test đạt | Một phần |
| PAY | Cổng thanh toán | Xử lý và đối soát thanh toán thật | payOS/webhook HMAC đã có; chờ khóa production và giao dịch thật | Đang bị chặn |

## Tiến độ năng lực

| Mã | Năng lực | Backend | DB | Frontend | Kiểm tra | Tổng thể | Việc tiếp theo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CAP-01 | Hạ tầng Docker | Hoàn thành | Hoàn thành | Hoàn thành | Hoàn thành | Hoàn thành | Hoàn tất deploy Render/Neon và kiểm tra endpoint HTTPS |
| CAP-02 | Đăng ký và đăng nhập | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Kiểm thử auth HTTPS và tự động refresh/logout server |
| CAP-03 | Hồ sơ cá nhân | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối Profile page và Settings với profileApi |
| CAP-04 | Sở thích lối sống | Hoàn thành | Hoàn thành | Một phần | Dự kiến | Một phần | Nối onboarding với lifestyleApi và thêm kiểm thử lưu dữ liệu |
| CAP-05 | Phòng | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối danh sách, chi tiết và form phòng với roomsApi |
| CAP-06 | Trắc nghiệm | Hoàn thành | Hoàn thành | Hoàn thành | Một phần | Một phần | Nối quiz UI với API và thêm kiểm thử chấm trait |
| CAP-07 | Ghép đôi | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối matchingApi và kiểm thử công thức/xếp hạng |
| CAP-08 | Lưu hồ sơ | Dự kiến | Hoàn thành | Một phần | Dự kiến | Một phần | Tạo REST API lưu/bỏ lưu và thay localStorage |
| CAP-09 | Chat realtime | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối frontend bằng SignalR client và kiểm thử realtime nhiều người dùng |
| CAP-10 | An toàn cộng đồng | Một phần | Hoàn thành | Một phần | Dự kiến | Một phần | Tạo member APIs cho block/report và nối moderation UI |
| CAP-11 | Thanh toán | Một phần | Hoàn thành | Một phần | Một phần | Một phần | Cấu hình payOS/webhook HTTPS, kiểm thử giao dịch thật và nối refund UI |
| CAP-12 | Quyền Premium | Một phần | Hoàn thành | Một phần | Một phần | Một phần | Nối entitlement UI và kiểm thử giới hạn Free/Premium |
| CAP-13 | Dịch vụ gần nhà | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối trang dịch vụ và lịch đặt với hyperlocalApi |
| CAP-14 | eKYC | Một phần | Hoàn thành | Dự kiến | Dự kiến | Một phần | Tạo luồng submit/status và chốt nhà cung cấp, chính sách dữ liệu |
| CAP-15 | Quản trị | Một phần | Hoàn thành | Một phần | Dự kiến | Một phần | Nối dashboard/moderation frontend và bổ sung quản lý tài khoản |
| CAP-16 | Thông báo và cài đặt | Dự kiến | Hoàn thành | Một phần | Dự kiến | Một phần | Tạo preferences API và nối Settings page |
| CAP-17 | Trợ lý AI | Dự kiến | Dự kiến | Một phần | Dự kiến | Dự kiến | Chốt use case, model, dữ liệu và ngân sách |

## Roadmap

| Giai đoạn | Tên | Mục tiêu | Trạng thái |
| --- | --- | --- | --- |
| P0 | Nền tảng | Docker, PostgreSQL, API modules và cấu trúc frontend | Hoàn thành |
| P1 | MVP tích hợp | Nối Auth, Profile, Lifestyle, Rooms, Matching và Hyperlocal vào frontend | Một phần |
| P2 | Tin cậy và giao tiếp | Chat an toàn, lịch sử, lưu hồ sơ, chặn và báo cáo | Một phần |
| P3 | Doanh thu và xác minh | Cổng thanh toán thật, Premium enforcement và eKYC | Một phần |
| P4 | Mở rộng | Admin hoàn chỉnh, B2B chủ trọ, Hyperlocal giao dịch và AI | Một phần |

## Lịch sử cập nhật

- **2026-10-01 - v1.2:** Hợp nhất Bao-Branch và main; cấu hình Render/Neon, migration production an toàn, nối Auth/payOS frontend; chưa bật thanh toán thật.
- **2026-09-30 - v1.2:** Đồng bộ tiến độ sau khi thêm quiz, SignalR chat, Premium enforcement, booking/refund, moderation và migration tự động.
- **2026-09-29 - v1.2:** Tạo dashboard tiến độ, ma trận 17 năng lực, roadmap và quy tắc cập nhật tài liệu sống.
- **2026-09-29 - v1.1:** Bổ sung định vị, roadmap, Premium, eKYC, AI, GTM và danh sách quyết định mở.

## Cách cập nhật

1. Sửa `docs/project-status.json` sau khi trạng thái triển khai thay đổi.
2. Cập nhật bảng tương ứng trong `docs/project-status.md` và thêm một mục vào lịch sử.
3. Cập nhật dashboard trong `output/pdf/RoomieMatch-SRS-v1.2-progress.pdf`.
4. Kiểm tra để ba file JSON, Markdown và PDF có cùng trạng thái.
