# Tổng hợp Backend RoomieMatch (cho Frontend)

Cập nhật: 2026-09-23

## 1. Cách xem API

- **Swagger UI:** `http://localhost:5000/swagger` (khi chạy qua Docker) — có nút **Authorize** để nhập Bearer token test trực tiếp.
- **OpenAPI spec:** `http://localhost:5000/openapi/v1.json` (OpenAPI 3.0 — tương thích tốt với các tool mock/codegen như orval, Prism, openapi-generator, msw).
- Chat service (Go) **không** nằm trong Swagger vì không phải REST — xem mục 7.

## 2. Auth — `api/auth`

- **Access token: 60 phút.** **Refresh token: 30 ngày.**
- `POST /api/auth/register` — `{Email, Password, DisplayName, City, District?, BirthDate?, Gender?, Occupation?}` → `AuthSessionDto`
- `POST /api/auth/login` — `{Email, Password}` → `AuthSessionDto`
- `POST /api/auth/refresh` — `{refreshToken}` → `AuthSessionDto` mới; refresh token cũ bị vô hiệu ngay (rotation). Dùng lại token đã rotate sẽ bị coi là bị đánh cắp và **thu hồi toàn bộ session** của user đó.
- `POST /api/auth/logout` — `{refreshToken}` → 204
- `GET /api/auth/me` [Auth] → `AuthenticatedUserDto`

**`AuthSessionDto` shape:**

```json
{
  "accessToken": "...",
  "tokenType": "Bearer",
  "expiresAt": "...",
  "refreshToken": "...",
  "refreshTokenExpiresAt": "...",
  "user": { "...": "AuthenticatedUserDto" }
}
```

> Frontend **bắt buộc** phải lưu cả `refreshToken` và tự gọi `/api/auth/refresh` khi access token hết hạn (sau 60 phút) — không thể chỉ lưu access token như trước.

## 3. Users — `api/users`

- `GET /api/users/profiles` — danh sách public → `UserProfileDto[]` (không có email)
- `GET /api/users/me/profile` / `PUT /api/users/me/profile` [Auth] → `ProfileDetailDto`
- `GET /api/users/me/lifestyle` / `PUT /api/users/me/lifestyle` [Auth] → `LifestylePreferencesDto`
- `GET /api/users/{userId}/profile` [Auth]

## 4. Matching — `api/matching`

- `GET /api/matching/matches?userId=` → `RoommateMatchDto[]`
- `POST /api/matching/me/recalculate` [Auth] → `{CandidatesScored, Matches[]}` (409 nếu chưa lưu lifestyle prefs)

## 5. Rooms — `api/rooms`

- `GET /api/rooms?city=&district=&maxRent=&availableBy=`
- `GET /api/rooms/me` [Auth]
- `GET /api/rooms/{roomId}`
- `POST /api/rooms` [Auth] / `PUT /api/rooms/{roomId}` [Auth] / `DELETE /api/rooms/{roomId}` [Auth] (soft delete qua `deleted_at`)

## 6. Hyperlocal — `api/hyperlocal`

- `GET /api/hyperlocal/services?city=&district=`
- `GET /api/hyperlocal/services/{serviceId}`
- `POST/PUT/DELETE /api/hyperlocal/services/{serviceId}` — chỉ role `admin`/`moderator`

## 6b. Thanh toán theo gói — `api/billing`

Hiện dùng **cổng thanh toán giả lập (mock)** — không trừ tiền thật. Luồng giống hệt cổng thật (VNPay/MoMo) nên khi gắn cổng thật, frontend không phải sửa.

- `GET /api/billing/plans` — bảng giá (server giữ giá, client không gửi số tiền):
  `free` 0₫ · `premium_monthly` 20.000₫/1 tháng · `premium_yearly` 180.000₫/12 tháng
- `GET /api/billing/me/subscription` [Auth] → `{tier: "free"|"premium", isPremium, subscriptionId, startsAt, endsAt}`
- `POST /api/billing/checkout` [Auth] — `{planCode}` → `{paymentId, planCode, amount, currency, paymentUrl, expiresAt}` (đơn hết hạn sau 15 phút)
- `GET /api/billing/payments/{paymentId}` [Auth] → trạng thái đơn: `pending | paid | failed | expired`
- `GET /api/billing/payments` [Auth] — lịch sử thanh toán (50 đơn gần nhất)

**Luồng frontend cần làm:**

1. User chọn gói → gọi `POST /api/billing/checkout`.
2. Redirect trình duyệt tới `paymentUrl` (trang thanh toán giả lập có 2 nút: thành công / thất bại).
3. Cổng redirect về **`/premium/result?paymentId=...&status=...`** — frontend cần tạo route này.
4. Ở trang result, **gọi lại `GET /api/billing/payments/{paymentId}`** để lấy trạng thái thật — không tin `status` trên URL (user sửa URL được).
5. Nếu `paid` → gọi `GET /api/billing/me/subscription` để cập nhật UI Premium.

Mua thêm khi đang Premium sẽ **cộng dồn** vào ngày hết hạn hiện tại, không mất ngày đã trả.

## 7. Chat (Go, ngoài `/api`, không có trong Swagger)

- `GET /health`
- `GET /ws` — WebSocket. Client gửi `{conversationId, senderId, content}`; server lưu DB rồi broadcast cho **tất cả** client đang kết nối (chưa lọc theo phòng chat, chưa auth trên socket).
- Chưa có REST CRUD cho conversations/messages, dù bảng DB đã có.

## 8. Cổng chạy local

| Service  | Cổng   |
| -------- | ------ |
| Web      | 3100   |
| API      | 5000   |
| Chat     | 8081   |
| Postgres | 55432  |

```bash
cp .env.example .env
docker compose up -d --build
```

Cổng đã được đổi khỏi mặc định (3000/5432) để chạy song song không đụng project khác trên máy dev.

## 9. Những phần chưa có (đừng mock nhầm)

- Chưa có REST API cho conversations/messages — chỉ có WebSocket.
- Chưa gắn cổng thanh toán thật (VNPay/MoMo) — đang dùng mock.
- Chưa có hoàn tiền, chưa tự gia hạn (cổng VN thanh toán một lần; hết hạn thì mua lại).
- Các tính năng Premium (bộ lọc nâng cao, quét không giới hạn...) **chưa được chặn theo gói** ở backend — mới có API cho biết user có phải Premium hay không.
