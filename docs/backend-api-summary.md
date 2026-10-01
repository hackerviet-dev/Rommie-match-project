# Tổng hợp Backend RoomieMatch (cho Frontend)

Cập nhật: 2026-09-29

## 1. Cách xem API

- **Swagger UI:** `http://localhost:5000/swagger` (khi chạy qua Docker) — có nút **Authorize** để nhập Bearer token test trực tiếp.
- **OpenAPI spec:** `http://localhost:5000/openapi/v1.json` (OpenAPI 3.0 — tương thích tốt với các tool mock/codegen như orval, Prism, openapi-generator, msw).
- REST chat (`/api/chat`) có trong Swagger; hub SignalR `/hubs/chat` thì không (không phải REST) — xem mục 7.
- Mỗi module có `GET /api/<module>/health` (public) trả tên module và danh sách tính năng — chỉ để kiểm tra, frontend không cần gọi.

## 2. Auth — `api/auth`

- **Access token: 60 phút.** **Refresh token: 30 ngày.**
- `POST /api/auth/register` — `{Email, Password, DisplayName, City, District?, BirthDate?, Gender?, Occupation?}` → `AuthSessionDto`
- `POST /api/auth/login` — `{Email, Password}` → `AuthSessionDto`
- `POST /api/auth/refresh` — `{refreshToken}` → `AuthSessionDto` mới; refresh token cũ bị vô hiệu ngay (rotation). Dùng lại token đã rotate sẽ bị coi là bị đánh cắp và **thu hồi toàn bộ session** của user đó.
- `POST /api/auth/logout` — `{refreshToken}` → 204
- `POST /api/auth/logout-all` [Auth] → 204 — thu hồi mọi session của user; có hiệu lực ngay, cả access token đang dùng cũng bị từ chối
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
- `GET /api/users/me/lifestyle` / `PUT /api/users/me/lifestyle` [Auth] → `LifestylePreferencesDto` (có thêm `roomEnvironment`: `quiet|moderate|lively|null` — nguồn cho điểm "Chịu ồn")
- `GET /api/users/{userId}/profile` [Auth]

## 4. Matching — `api/matching`

- `GET /api/matching/me/matches` [Auth] → `PagedResult<RoommateMatchDto>` (`?page=&pageSize=` + bộ lọc)
  - Bộ lọc tiêu chuẩn (mọi gói): `q` (tên/sở thích), `minScore`, `sameCity`, `petFriendly`, `nonSmoking`, `moveInBy` (yyyy-MM-dd)
  - Bộ lọc nâng cao (**Premium**): `budgetMin`, `budgetMax`, `district`, `roomEnvironment` (`quiet|moderate|lively`), `minCleanliness` (1–5), `verifiedOnly` → gói free nhận **403 `premium_required`**
- `GET /api/matching/me/matches/{candidateId}` [Auth] → `MatchDetailDto` `{match, bio, sharedInterests, calculatedAt, comparison, comparisonLocked}` — 404 nếu người đó không nằm trong danh sách của mình. `comparison` (so sánh từng tiêu chí hai bên) chỉ có với Premium; free nhận `null` + `comparisonLocked: true`.
- `POST /api/matching/me/recalculate` [Auth] → `{candidatesScored, matches}`
  - 409 `lifestyle_required` nếu chưa lưu lifestyle prefs
  - Free: **5 lượt quét/tháng** (tháng dương lịch, giờ VN) → hết lượt nhận **403 `scan_quota_exceeded`** kèm `resetsAt`. Premium không giới hạn.
- `GET /api/matching/me/usage` [Auth] → `{isPremium, scansUsed, scansLimit, scansRemaining, boostsUsed, boostsLimit, activeBoost, periodStartsAt, periodResetsAt}` (`scansLimit = null` là không giới hạn)
- `POST /api/matching/me/boost` [Auth, **Premium**] → `{id, startsAt, endsAt}` — boost 30 phút, tối đa 4 lần/tháng. Lỗi: 403 `premium_required` / `boost_quota_exceeded`, 409 `boost_active` (kèm `boost` đang chạy), 409 `profile_hidden`. Hồ sơ đang boost được xếp cao hơn trong danh sách của người khác (`isBoosted: true`), **điểm hiển thị không đổi**.
- `GET /api/matching/quiz` (public) → bộ câu hỏi `{code, title, questions[{id, text, emoji, options[{id, text}]}]}`
- `GET /api/matching/me/quiz` [Auth] → kết quả đã lưu (404 nếu chưa làm) · `PUT /api/matching/me/quiz` [Auth] body `{answers: {"<questionId>": "<optionId>"}}` → `{code, title, answers, traits{noiseTolerance, tidiness, earlyBird, costSplit}, tags[], completedAt, updatedAt}`. Làm lại sẽ ghi đè. Lưu quiz **không** tự tính lại điểm — gọi `recalculate` sau đó.

`RoommateMatchDto`: `{id, name, age, occupation, city, district, avatarUrl, isVerified, score, breakdown, explanation, budgetMin, budgetMax, interests, isBoosted}`
- `age` là `null` khi người dùng bật ẩn tuổi hoặc chưa khai.
- `breakdown` là mảng có kiểu `[{key, label, value, weight}]`, đúng thứ tự hiển thị: Giờ giấc ngủ · Sạch sẽ · Lối sống xã hội · Ngân sách · **Chịu ồn** · Khu vực · Thói quen · Sở thích · Thời điểm dọn vào. Dùng `key` (`sleep`, `noise`, ...) trong code, `label` để hiển thị. Điểm tính trước khi có tiêu chí "Chịu ồn" sẽ thiếu mục này cho đến lần quét kế tiếp.
- "Chịu ồn" lấy từ `roomEnvironment` trong `PUT /api/users/me/lifestyle` nếu có, không thì ước lượng từ quiz.

Lỗi gắn gói/quota đều là problem details có trường `code` ổn định (`premium_required`, `scan_quota_exceeded`, `boost_quota_exceeded`, `boost_active`, `profile_hidden`, `lifestyle_required`) — frontend nên dựa vào `code`, không parse câu tiếng Việt.

## 5. Rooms — `api/rooms`

- `GET /api/rooms?city=&district=&maxRent=&availableBy=`
- `GET /api/rooms/me` [Auth]
- `GET /api/rooms/{roomId}`
- `POST /api/rooms` [Auth] / `PUT /api/rooms/{roomId}` [Auth] / `DELETE /api/rooms/{roomId}` [Auth] (soft delete qua `deleted_at`)
- Trường chi tiết phòng (đều tuỳ chọn, có trong cả `RoomDto` lẫn body POST/PUT): `propertyType` (`apartment|house|studio|dormitory`), `bedrooms` (1–50), `areaM2` (số thập phân 1 chữ số), `roommatesNeeded` (phải **nhỏ hơn** `maxOccupants`, vì người đăng cũng ở đó). PUT là ghi đè toàn bộ: bỏ trống trường nào thì trường đó thành `null`.

## 6. Hyperlocal — `api/hyperlocal`

- `GET /api/hyperlocal/services?city=&district=&category=` — `category` so khớp chính xác với giá trị lưu trong DB (vd `Giặt ủi`, `Giao nước`); bỏ trống thì lấy tất cả.
- `GET /api/hyperlocal/services/{serviceId}`
- `POST/PUT/DELETE /api/hyperlocal/services/{serviceId}` — chỉ role `admin`/`moderator`

**Đặt dịch vụ** [Auth] — chỉ thấy và thao tác được lịch hẹn của chính mình; lịch của người khác trả **404**.

- `POST /api/hyperlocal/services/{serviceId}/bookings` — `{scheduledAt, address, contactPhone, note?}` → 201 `ServiceBookingDto`. `scheduledAt` phải sau hiện tại ít nhất 30 phút và không quá 60 ngày (sai thì 400). Dịch vụ không tồn tại/đã xoá → 404.
- `GET /api/hyperlocal/me/bookings?page=&pageSize=` → `PagedResult<ServiceBookingDto>`, mới nhất trước
- `GET /api/hyperlocal/me/bookings/{bookingId}` → `ServiceBookingDto`
- `POST /api/hyperlocal/me/bookings/{bookingId}/cancel` → `ServiceBookingDto` đã huỷ. Chỉ huỷ được lịch `pending`/`confirmed` chưa tới giờ; còn lại **409 `booking_not_cancellable`**.

`ServiceBookingDto`: `{id, serviceId, serviceName, serviceCategory, servicePhone, scheduledAt, address, contactPhone, note, status, cancelledAt, createdAt, updatedAt}` — `status`: `pending | confirmed | completed | cancelled`.

## 6b. Thanh toán theo gói — `api/billing`

Hiện dùng **cổng thanh toán giả lập (mock)** — không trừ tiền thật. Luồng giống hệt cổng thật (VNPay/MoMo) nên khi gắn cổng thật, frontend không phải sửa.

- `GET /api/billing/plans` — bảng giá (server giữ giá, client không gửi số tiền):
  `free` 0₫ · `premium_monthly` 20.000₫/1 tháng · `premium_yearly` 180.000₫/12 tháng
- `GET /api/billing/me/subscription` [Auth] → `{tier: "free"|"premium", isPremium, subscriptionId, startsAt, endsAt}`
- `POST /api/billing/checkout` [Auth] — `{planCode}` → `{paymentId, planCode, amount, currency, paymentUrl, expiresAt}` (đơn hết hạn sau 15 phút)
- `GET /api/billing/payments/{paymentId}` [Auth] → trạng thái đơn: `pending | paid | failed | expired | refunded`
- `GET /api/billing/payments` [Auth] — lịch sử thanh toán (50 đơn gần nhất)
- `POST /api/billing/payments/{paymentId}/refund` [Auth] — body tuỳ chọn `{reason?}` → `PaymentDto` với `status: "refunded"`. Chỉ hoàn được đơn `paid` trong **7 ngày** kể từ `paidAt`. Số tháng của đơn đó bị trừ khỏi ngày hết hạn Premium (đơn cộng dồn khác vẫn giữ nguyên ngày); nếu không còn ngày nào thì Premium kết thúc ngay. Lỗi (409, có `code`): `already_refunded`, `payment_not_refundable` (đơn chưa thanh toán), `refund_window_expired`; 503 `gateway_unavailable`; đơn của người khác → 404.

`PaymentDto`: `{id, planCode, amount, currency, provider, status, createdAt, expiresAt, paidAt, refundedAt, refundableUntil}` — `refundableUntil` chỉ có giá trị khi đơn còn hoàn được, nên dùng nó để quyết định hiện nút "Hoàn tiền".

**Luồng frontend cần làm:**

1. User chọn gói → gọi `POST /api/billing/checkout`.
2. Redirect trình duyệt tới `paymentUrl` (trang thanh toán giả lập có 2 nút: thành công / thất bại).
3. Cổng redirect về **`/premium/result?paymentId=...&status=...`** — frontend cần tạo route này.
4. Ở trang result, **gọi lại `GET /api/billing/payments/{paymentId}`** để lấy trạng thái thật — không tin `status` trên URL (user sửa URL được).
5. Nếu `paid` → gọi `GET /api/billing/me/subscription` để cập nhật UI Premium.

Mua thêm khi đang Premium sẽ **cộng dồn** vào ngày hết hạn hiện tại, không mất ngày đã trả.

**payOS — nhận tiền thật (chuyển khoản/QR)**

Đặt `Billing:Provider=payos` để dùng cổng payOS. Endpoint, `PaymentDto` và luồng xác nhận không đổi; chỉ khác nguồn tiền và cách xác nhận.

- Cấu hình: `Billing__PayOs__ClientId`, `Billing__PayOs__ApiKey`, `Billing__PayOs__ChecksumKey` (biến môi trường / `.env`; repo chỉ để giá trị rỗng). Kênh thanh toán và checksum key tạo tại https://my.payos.vn. Thiếu cấu hình thì `POST /api/billing/checkout` trả **502** ngay, không tạo đơn.
- `paymentUrl` trả về là trang thanh toán của payOS (khách quét VietQR / chuyển khoản Napas 247).
- payOS trả khách về `Billing:ReturnUrl` kèm thêm query param **của payOS** (`code`, `id`, `cancel`, `status`, `orderCode`). Server tự gắn `paymentId` vào cả `returnUrl` lẫn `cancelUrl` **trước khi ký**, nên frontend đọc thẳng `paymentId` trên URL rồi gọi `GET /api/billing/payments/{paymentId}` để lấy trạng thái thật như bước 4 (không cần nhớ `paymentId` từ response checkout nữa).
- `POST /api/billing/payos/webhook` (public, payOS gọi) — kiểm tra chữ ký `HMAC_SHA256` bằng checksum key rồi xác nhận đơn qua đúng luồng `ConfirmPaymentAsync`, nên vẫn idempotent. Số tiền webhook gửi lên được đối chiếu với `payments.amount`: lệch thì **không** kích hoạt Premium (đơn giữ nguyên trạng thái) nhưng vẫn trả 2XX. Tương tự, đơn đã ở trạng thái `failed`/`expired`/`refunded` mà payOS báo đã trả cũng **không** kích hoạt Premium. Hai trường hợp này server ghi log cảnh báo (chỉ order code + trạng thái, không log body/chữ ký/key). Body lớn hơn 16 KB bị từ chối với **413**. Khai báo webhook URL trên my.payos.vn là `{PublicApiBaseUrl}/api/billing/payos/webhook`; endpoint trả 2XX cho mọi payload đúng chữ ký, kể cả order code lạ (payOS gửi mẫu như vậy lúc đăng ký webhook).
- Hoàn tiền: payOS không có API hoàn tiền cho đơn đã thanh toán (chỉ huỷ được link chưa thanh toán), nên `POST /api/billing/payments/{paymentId}/refund` trả **502 `refund_rejected`** với đơn payOS — phải hoàn tiền thủ công.
- Số tiền và gói vẫn lấy 100% từ server (`Plans`); webhook không bao giờ tự đặt số tiền hay gói.

## 7. Chat — `api/chat` (REST) + `/hubs/chat` (SignalR)

Service Go đã bỏ; chat nằm trong API .NET. Mọi endpoint cần đăng nhập. Người không phải thành viên cuộc trò chuyện luôn nhận **404** (không lộ cuộc trò chuyện có tồn tại hay không).

**REST**

- `GET /api/chat/conversations?page=&pageSize=` → `PagedResult<ConversationDto>`, mới nhất lên đầu
- `POST /api/chat/conversations` — `{userId}` → `ConversationDto`. Mở cuộc trò chuyện 1:1; đã có thì trả lại cái cũ (gọi nhiều lần/đồng thời không tạo trùng). 403 nếu là chính mình, người kia bị khoá/ẩn hồ sơ, hoặc có chặn.
- `GET /api/chat/conversations/{id}` → `ConversationDto`
- `GET /api/chat/conversations/{id}/messages?limit=30&beforeId=` → `{items, hasMore}` — **mới nhất trước**. Tải tin cũ hơn: truyền `beforeId` = id tin cũ nhất đang có. `limit` tối đa 50.
- `POST /api/chat/conversations/{id}/messages` — `{content}` (1–4000 ký tự) → `MessageDto`. Gửi qua REST **cũng được đẩy realtime** qua SignalR.
- `POST /api/chat/conversations/{id}/read` → `{conversationId, userId, readAt}` — đánh dấu đã đọc hết.

`ConversationDto`: `{id, partner{userId, displayName, avatarUrl, isVerified}, lastMessage, unreadCount, isBlocked, updatedAt}` — `isBlocked: true` thì khoá ô nhập (vẫn xem được lịch sử, gửi sẽ bị 403).
`MessageDto`: `{id, conversationId, senderId, content, createdAt, readAt}`

**SignalR — `/hubs/chat`** (`@microsoft/signalr`)

```ts
const connection = new HubConnectionBuilder()
  .withUrl("/hubs/chat", { accessTokenFactory: () => getAccessToken() })
  .withAutomaticReconnect()
  .build();

connection.on("MessageReceived", (m: MessageDto) => {});
connection.on("ConversationRead", (r: { conversationId; userId; readAt }) => {});
connection.on("Typing", (t: { conversationId; userId }) => {});

await connection.start();
const saved = await connection.invoke<MessageDto>("SendMessage", conversationId, "Chào bạn!");
await connection.invoke("MarkRead", conversationId);
await connection.invoke("Typing", conversationId); // nên throttle ~3 giây/lần
```

- Xác thực: access token đi qua `?access_token=` (thư viện tự làm qua `accessTokenFactory`). Chỉ đường `/hubs/*` nhận token trên URL.
- Định tuyến: sự kiện chỉ gửi tới **thành viên của cuộc trò chuyện** (mọi tab/thiết bị đang mở của họ). `MessageReceived` cũng về các tab khác của chính người gửi. `Typing` chỉ tới người kia.
- Lỗi (không phải thành viên, bị chặn, tin rỗng...) trả về dạng lỗi của `invoke` với câu tiếng Việt.
- Socket bị server đóng khi access token hết hạn (60 phút) hoặc sau `logout-all`/đổi mật khẩu → client lấy token mới qua `/api/auth/refresh` rồi `start()` lại. `withAutomaticReconnect` gọi lại `accessTokenFactory` nên chỉ cần hàm đó luôn trả token còn hạn.
- Giới hạn 120 lần gọi hub/phút/người.

## 8. Cổng chạy local

| Service  | Cổng   |
| -------- | ------ |
| Web      | 3100   |
| API      | 5000   |
| Postgres | 55432  |

```bash
cp .env.example .env
docker compose up -d --build
```

Cổng đã được đổi khỏi mặc định (3000/5432) để chạy song song không đụng project khác trên máy dev.

## 9. Những phần chưa có (đừng mock nhầm)

- Chat: chưa có trạng thái online, chưa gửi ảnh/file, chưa có thông báo đẩy khi offline. Hub giữ kết nối trong RAM của một instance — chạy nhiều instance API cần thêm Redis backplane.
- Chưa gắn cổng thanh toán thật (VNPay/MoMo) — đang dùng mock.
- Chưa tự gia hạn (cổng VN thanh toán một lần; hết hạn thì mua lại).
- Đặt dịch vụ: chưa có API để staff/nhà cung cấp chuyển lịch sang `confirmed`/`completed` — hiện lịch mới luôn ở `pending` cho tới khi user huỷ. Chưa có API liệt kê danh sách category (frontend tự giữ danh sách chip).
- "Xem ai đã xem bạn" (Premium) chưa có API.
