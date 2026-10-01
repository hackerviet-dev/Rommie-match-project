# Trạng thái dự án RoomieMatch

- Cập nhật: **2026-10-02**
- Phiên bản tài liệu: **1.2**
- Branch/commit kiểm tra: **Duy-feature/landing-page-fe / 41baa99**
- Giai đoạn hiện tại: **MVP - nối frontend với backend và hoàn thiện các luồng cốt lõi**
- Mức bao phủ kỹ thuật: **64%**

> Phần trăm tính theo bốn lớp backend, database, frontend và verification; done = 1, partial = 0.5, planned/blocked = 0, bỏ qua na. Đây không phải phần trăm thời gian hoặc ngân sách.

## Actor

| Mã | Actor | Mục tiêu | Hiện trạng | Trạng thái |
| --- | --- | --- | --- | --- |
| G | Khách | Xem nội dung công khai và tạo phiên đăng nhập | Form đăng ký/đăng nhập web đã nối Auth API; phiên được kiểm tra qua /me và tự refresh; chưa có Google OAuth. | Một phần |
| M | Thành viên | Quản lý hồ sơ, phòng, ghép đôi, chat và an toàn | Backend có hồ sơ, phòng, quiz, matching, chat, booking và billing; frontend phần lớn còn mock/local state | Một phần |
| P | Premium | Thanh toán và nhận quyền lợi Premium được backend thực thi | Backend đã thực thi hạn mức, có payOS và frontend checkout/result; chưa bật thanh toán production | Một phần |
| MOD | Kiểm duyệt viên | Duyệt xác minh, báo cáo và nội dung | Có API duyệt báo cáo, xác minh và CRUD dịch vụ; chưa có giao diện moderation nối API | Một phần |
| A | Quản trị viên | Quản lý tài khoản, dịch vụ, báo cáo và dashboard | Có API thống kê, báo cáo, xác minh và quản lý dịch vụ; dashboard frontend vẫn dùng dữ liệu mẫu | Một phần |
| SYS | Hệ thống | Điều phối API, dữ liệu, matching, chat và phân quyền | .NET API đã chứa SignalR chat; PostgreSQL có migration tự động; Docker build và smoke test đạt | Một phần |
| PAY | Cổng thanh toán | Xử lý và đối soát thanh toán thật | Đã tích hợp payOS và webhook ký HMAC; chờ khóa production và kiểm thử giao dịch thật | Đang bị chặn |

## Tiến độ năng lực

| Mã | Năng lực | Backend | DB | Frontend | Kiểm tra | Tổng thể | Việc tiếp theo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CAP-01 | Hạ tầng Docker | Hoàn thành | Hoàn thành | Hoàn thành | Hoàn thành | Hoàn thành | Theo dõi hạn mức Free; dùng instance luôn bật trước khi nhận thanh toán thật |
| CAP-02 | Đăng ký và đăng nhập | Hoàn thành | Hoàn thành | Hoàn thành | Một phần | Một phần | Kiểm thử tương tác trình duyệt và nhiều tab; Google OAuth là luồng riêng chưa triển khai. |
| CAP-03 | Hồ sơ cá nhân | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối lưu hồ sơ bổ sung onboarding và Profile page với profileApi. |
| CAP-04 | Sở thích lối sống | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối onboarding với lifestyleApi; kiểm thử lưu dữ liệu và khôi phục các lựa chọn. |
| CAP-05 | Phòng | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối danh sách, chi tiết và form phòng với roomsApi. |
| CAP-06 | Trắc nghiệm | Hoàn thành | Hoàn thành | Hoàn thành | Một phần | Một phần | Nối quiz UI với API và thêm kiểm thử chấm trait |
| CAP-07 | Ghép đôi | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối matchingApi và kiểm thử công thức/xếp hạng |
| CAP-08 | Lưu hồ sơ | Dự kiến | Hoàn thành | Một phần | Dự kiến | Một phần | Tạo REST API lưu/bỏ lưu và thay localStorage |
| CAP-09 | Chat realtime | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối frontend bằng SignalR client và kiểm thử realtime nhiều người dùng |
| CAP-10 | An toàn cộng đồng | Một phần | Hoàn thành | Một phần | Dự kiến | Một phần | Tạo member APIs cho block/report và nối moderation UI |
| CAP-11 | Thanh toán | Một phần | Hoàn thành | Một phần | Một phần | Một phần | Kiểm thử checkout/webhook/kết quả thanh toán với khóa payOS mới và cấu hình HTTPS; không bật production trước khi kiểm tra. |
| CAP-12 | Quyền Premium | Một phần | Hoàn thành | Một phần | Một phần | Một phần | Nối entitlement UI và kiểm thử giới hạn Free/Premium |
| CAP-13 | Dịch vụ gần nhà | Hoàn thành | Hoàn thành | Một phần | Một phần | Một phần | Nối trang dịch vụ và lịch đặt với hyperlocalApi |
| CAP-14 | eKYC | Một phần | Hoàn thành | Dự kiến | Dự kiến | Một phần | Tạo luồng submit/status và chốt nhà cung cấp, chính sách dữ liệu |
| CAP-15 | Quản trị | Một phần | Hoàn thành | Một phần | Dự kiến | Một phần | Nối dashboard/moderation frontend và bổ sung quản lý tài khoản |
| CAP-16 | Thông báo và cài đặt | Dự kiến | Hoàn thành | Một phần | Một phần | Một phần | Tạo preferences/notification API, nối tùy chọn Settings và hồ sơ đã lưu; nối chỉnh sửa chỗ ở với dữ liệu thật. |
| CAP-17 | Trợ lý AI | Dự kiến | Dự kiến | Một phần | Dự kiến | Dự kiến | Chốt use case, model, dữ liệu và ngân sách |

## Bằng chứng kiểm tra

- **CAP-01 - Hạ tầng Docker:** Compose chạy PostgreSQL, migration, API/SignalR và web; build/smoke test đạt. Trang chủ giữ màu, phông chữ và nội dung; hướng dẫn cạnh thẻ ghép đôi, Premium căn đều, footer bốn cột; header ẩn/hiện theo hướng cuộn. Kiểm tra desktop/mobile, menu, anchor, FAQ; lint/typecheck/build đạt (6 cảnh báo lint cũ). Render API Live với Neon, 10 migration production thành công; HTTPS health Healthy, 3 plans, CORS production/preview đạt; Vercel main/Bao-Branch redeploy Ready; Docker rerun không seed demo đạt
- **CAP-02 - Đăng ký và đăng nhập:** Web dùng register/login/me/refresh/logout/logout-all thật với RHF/Zod; JWT/refresh token trong sessionStorage, single-flight refresh, logout event và guard phiên/user/role. Giữ giao diện login/register, nút quay lại, header khách Premium và returnTo nội bộ sau login. Smoke API trước merge: register, login sai/đúng, me, refresh đồng thời, logout. Sau merge: lint/typecheck/build, regression onboarding đạt; chưa chạy lại UI sau merge vì trình duyệt không kết nối được localhost; chưa kiểm thử auth HTTPS/nhiều tab.
- **CAP-03 - Hồ sơ cá nhân:** GET/PUT profile có phân quyền; onboarding đã đọc GET me/profile và hiện họ tên, giới tính, thành phố đã đăng ký thành tóm tắt; chỉ hiện ô nhập thông tin thiếu. Validation từng bước có lỗi đỏ, tự focus; kiểm thử schema, UI bước 1/2, lint/typecheck/build đạt. Chưa lưu bổ sung onboarding lên server. Settings đọc GET me/profile theo userId; dialog dùng dữ liệu thật, trường thiếu để trống; PUT profile lưu tên/ngày sinh/giới tính/nơi ở/nghề nghiệp/giới thiệu và cập nhật cache. Kiểm tra tài khoản mới chưa onboarding, validation tên trống, lưu/tải lại/đăng nhập lại bằng API thật; lint/typecheck/build đạt.
- **CAP-04 - Sở thích lối sống:** GET/PUT lifestyle đã có; onboarding kiểm tra từng lựa chọn bắt buộc, đánh dấu đỏ và chặn sang bước tiếp theo khi thiếu; kiểm thử schema và UI bước 2 đạt. Onboarding chưa lưu lifestyle lên server. Settings đọc lifestyle thật; 404 hiện chưa cập nhật, không gán lựa chọn mẫu; lỗi tải có nút thử lại.
- **CAP-05 - Phòng:** Rooms list/detail/CRUD có phân quyền và soft delete; onboarding đã validate cả hai nhánh chỗ ở, số dương/số nguyên, tiền thuê và ngày hợp lệ; kiểm thử schema đạt. Form chưa nối lưu phòng lên API.
- **CAP-06 - Trắc nghiệm:** Quiz definition, GET/PUT kết quả và quiz_responses đã có; submit smoke test đạt
- **CAP-07 - Ghép đôi:** Matching có điểm chi tiết, quota, filter và boost; list/usage đã smoke test
- **CAP-08 - Lưu hồ sơ:** Đã có bảng saved_profiles; frontend vẫn dùng localStorage và chưa có REST API
- **CAP-09 - Chat realtime:** SignalR có JWT, nhóm user/conversation, REST history, read receipt và lưu PostgreSQL; REST start chat đã smoke test
- **CAP-10 - An toàn cộng đồng:** Có bảng blocks/reports và API admin duyệt report; chưa có API thành viên gửi report/chặn
- **CAP-11 - Thanh toán:** Có payOS checkout/webhook HMAC, frontend checkout/result dùng billingApi; provider production mặc định tắt; chưa kiểm thử giao dịch thật Checkout web và trang kết quả đã gọi billingApi sau merge; chưa kiểm thử giao dịch payOS thật.
- **CAP-12 - Quyền Premium:** Backend enforce scan quota, advanced filters và Boost; usage đã smoke test. Premium công khai có header khách, gói miễn phí tới register và trả phí tới login. Thành viên gọi checkout theo gói tháng/năm, nhận paymentUrl; trang kết quả đọc trạng thái API. Checkout chỉ bật khi health provider payos/mock; chưa kiểm thử thanh toán thật.
- **CAP-13 - Dịch vụ gần nhà:** List/detail/filter/CRUD và booking/cancel đã có; smoke test booking đạt
- **CAP-14 - eKYC:** Có bảng verification và API admin duyệt; chưa có API người dùng nộp hồ sơ hoặc nhà cung cấp eKYC
- **CAP-15 - Quản trị:** Có API stats, report queue, verification queue và CRUD dịch vụ; admin smoke test đạt
- **CAP-16 - Thông báo và cài đặt:** Settings đã đọc/cập nhật hồ sơ cá nhân qua profileApi, đọc lifestyle và subscription thật; bỏ hồ sơ Nguyễn Linh, phòng mẫu và badge quiz giả. Kiểm tra tài khoản mới bỏ dở onboarding, lưu/tải lại/đăng nhập lại; lint/typecheck/build đạt. Tùy chọn thông báo/quyền riêng tư và ngôn ngữ chưa có API lưu; hồ sơ đã lưu còn localStorage/fixtures.
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

- **2026-10-02 - v1.2:** Giải quyết conflict Bao-Branch: giữ RHF/Zod và khôi phục/refresh/logout phiên thật; token sessionStorage; thêm returnTo login, checkout payOS và trang kết quả thanh toán. Giữ header khách Premium và sửa hồ sơ Settings; đồng bộ trạng thái cả hai nhánh. Lint/typecheck/build và regression onboarding đạt; chưa build backend tại máy do thiếu dotnet SDK.
- **2026-10-02 - v1.2:** Thay header ẩn trên Premium bằng header công khai theo ảnh: logo, Trang chủ, Premium, Đăng nhập và Đăng ký; không hiện avatar/chuông/menu thành viên. Kiểm tra gói trả phí tới login, miễn phí tới register; lint/typecheck/build đạt.
- **2026-10-02 - v1.2:** Mở trang Premium cho khách và ẩn toàn bộ header cùng menu dưới khi chưa đăng nhập; CTA trả phí chuyển đăng nhập, gói miễn phí chuyển đăng ký. Giữ header thành viên và bảo vệ Settings; kiểm tra UI khách, lint/typecheck/build đạt.
- **2026-10-02 - v1.2:** Sửa Settings hiển thị hồ sơ mẫu sau khi bỏ dở onboarding: lấy thông tin đăng ký từ API, để trống mục thiếu, bỏ phòng/badge quiz giả; form có validation và PUT lưu hồ sơ thật. Kiểm tra tài khoản mới, lưu/tải lại/đăng nhập lại và lint/typecheck/build.
- **2026-10-02 - v1.2:** Thu gọn phần giới thiệu bên trái trang login: bỏ dòng mô tả nhỏ, giảm khoảng cách và giới hạn lưới avatar; dùng bố cục theo nội dung để tránh cắt avatar trên màn hình thấp. Kiểm tra 1440x720, lint/typecheck/build đạt.
- **2026-10-02 - v1.2:** Sửa luồng khách: bảo vệ route Premium, guard kiểm tra user, ẩn avatar/thông báo/Cài đặt khi chưa đăng nhập; menu khách chỉ có trang chủ, dịch vụ và Premium. Thêm logo RoomieMatch cho favicon và apple-touch-icon; kiểm tra luồng khách, lint/typecheck/build.
- **2026-10-02 - v1.2:** Cân lại mật độ trang chủ: ba bước hướng dẫn cạnh thẻ ghép đôi, Premium đồng bộ căn lề và CTA ở cuối, footer thêm điều hướng sẵn có và giảm khoảng cách. Chuyển nút quay lại login xuống dưới logo bên trái, hỗ trợ mobile. Giữ màu/phông chữ/nội dung; lint/typecheck/build đạt.
- **2026-10-02 - v1.2:** Header trang chủ tự trượt ẩn khi cuộn xuống, hiện lại khi cuộn lên hoặc về đầu trang; hỗ trợ bàn phím/reduced-motion. Giữ phông chữ và cỡ chữ ban đầu theo yêu cầu; lint/typecheck/build đạt.
- **2026-10-02 - v1.2:** Đổi bố cục trang chủ theo tham chiếu Tinder: header ngang, hero lớn ở giữa, thẻ tính năng cao, khối nội dung rộng và footer chữ lớn. Giữ palette và nội dung RoomieMatch; responsive desktop/mobile, menu tự đóng và FAQ được kiểm tra; không đổi mức hoàn thành API.
- **2026-10-01 - v1.2:** Cập nhật giao diện onboarding: thông tin đăng ký hiện thành tóm tắt; chỉ nhập mục còn thiếu. Thêm validation bốn bước, lỗi đỏ từng mục và focus ô lỗi; đọc profile thật, kiểm thử schema/UI và lint/typecheck/build.
- **2026-10-01 - v1.2:** Nối Auth web với register/login/me/refresh/logout/logout-all; loại bỏ phiên mock, thêm validation/loading/error và vô hiệu hóa nút Google chưa hỗ trợ. Kiểm tra API thật, lint, typecheck và build; còn kiểm thử UI trình duyệt.
- **2026-10-01 - v1.2:** Hợp nhất Bao-Branch và main; Render/Neon Live, HTTPS health/CORS đạt, Vercel production/preview Ready; nối Auth/payOS frontend; chưa bật thanh toán thật.
- **2026-09-30 - v1.2:** Đồng bộ tiến độ sau khi thêm quiz, SignalR chat, Premium enforcement, booking/refund, moderation và migration tự động.
- **2026-09-29 - v1.2:** Tạo dashboard tiến độ, ma trận 17 năng lực, roadmap và quy tắc cập nhật tài liệu sống.
- **2026-09-29 - v1.1:** Bổ sung định vị, roadmap, Premium, eKYC, AI, GTM và danh sách quyết định mở.

## Cách cập nhật

1. Cập nhật JSON nguồn sau khi trạng thái triển khai thay đổi.
2. Chạy `scripts/sync-project-status.py` bằng Python có reportlab và pypdf.
3. Kiểm tra JSON, Markdown và render dashboard PDF.
