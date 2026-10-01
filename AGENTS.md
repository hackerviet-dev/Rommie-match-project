# Quy tắc cập nhật trạng thái dự án

Các AI coding agent khi sửa chức năng, API, database, frontend, mobile, chat, thanh toán hoặc test trong repository này phải cập nhật tài liệu trạng thái dự án.

## Nguồn trạng thái

Tài liệu trạng thái, ảnh kiểm tra và PDF chỉ lưu cục bộ. Không stage, commit hoặc push `docs/`, `output/`, `tmp/` và file tài liệu xuất; không dùng `git add -f` để bỏ qua quy tắc ignore. Vẫn cập nhật và kiểm tra tài liệu cục bộ theo các bước dưới đây. Ảnh/logo/icon là tài nguyên chạy ứng dụng trong frontend không thuộc nhóm tài liệu kiểm tra này.

- Dữ liệu nguồn: `docs/project-status.json`.
- Bản đọc nhanh: `docs/project-status.md`.
- Bản SRS có dashboard: `output/pdf/RoomieMatch-SRS-v1.2-progress.pdf`.

## Khi nào phải cập nhật

Sau một thay đổi làm tiến độ của bất kỳ hạng mục nào thay đổi:

1. Cập nhật các cột `backend`, `database`, `frontend`, `verification`, `status`, `evidence` và `nextAction` của hạng mục liên quan trong `docs/project-status.json`.
2. Cập nhật `lastUpdated`, `baseline.branch`, `baseline.commit` và thêm một mục vào `changelog`.
3. Không đánh dấu `done` nếu mới chỉ có giao diện mẫu, mock data, localStorage hoặc API chưa được frontend sử dụng.
4. Cập nhật bảng dashboard và lịch sử thay đổi trong PDF để khớp với JSON/Markdown.
5. Kiểm tra file JSON, Markdown và PDF trước khi kết thúc công việc.

## Ý nghĩa trạng thái

- `done`: Luồng mục tiêu đã nối qua các tầng áp dụng và có kiểm tra phù hợp.
- `partial`: Đã có một phần chạy được nhưng luồng còn đứt.
- `planned`: Chưa có triển khai đáng kể.
- `blocked`: Không thể tiếp tục vì còn quyết định hoặc phụ thuộc bên ngoài.

Phần trăm tổng thể được tính theo bốn lớp backend, database, frontend và verification. Đây là mức độ bao phủ kỹ thuật, không phải phần trăm thời gian hoặc chi phí đã sử dụng.
