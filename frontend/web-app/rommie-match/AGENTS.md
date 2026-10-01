# Quy tắc bắt buộc cho frontend web

Mọi AI coding agent khi đọc, tạo, sửa, di chuyển hoặc review file trong thư mục `frontend/web-app/rommie-match` phải tuân thủ tài liệu này.

- Áp dụng các quy tắc dưới đây cho toàn bộ web app, bao gồm `src`, cấu hình Vite, package, Docker và test.
- Giữ nguyên hành vi hiện có khi chỉ được yêu cầu refactor cấu trúc.
- Không xóa hoặc thay thế Supabase cho đến khi người dùng quyết định backend chính thức.
- Sau khi thay đổi code, phải chạy lint, TypeScript typecheck và production build phù hợp.
- Nếu yêu cầu của người dùng xung đột với tài liệu này, ưu tiên yêu cầu mới nhất của người dùng.

## Cấu trúc mã nguồn frontend

Ứng dụng web được tổ chức theo trách nhiệm và từng tính năng nghiệp vụ:

- `app`: chứa các provider dùng cho toàn ứng dụng và cấu hình TanStack Query.
- `assets`: chứa hình ảnh, biểu tượng, phông chữ và các tài nguyên tĩnh được đóng gói cùng ứng dụng.
- `components`: chứa các component giao diện dùng chung. `ui` chứa các component nền tảng; `common` chứa các component hoàn chỉnh được dùng ở nhiều nơi trong ứng dụng.
- `constants`: chứa đường dẫn route, danh sách địa điểm và các giá trị hằng dùng chung.
- `features`: chứa các module nghiệp vụ. Mỗi module tự quản lý API service, type, store, hook và component riêng của tính năng đó.
- `hooks`: chứa các hook dùng chung, không thuộc riêng một tính năng nghiệp vụ.
- `integrations`: chứa client của các nền tảng bên ngoài. Supabase vẫn được giữ tại đây cho đến khi dự án quyết định chính thức backend sẽ sử dụng.
- `layouts`: chứa khung giao diện và hệ thống điều hướng dùng chung cho các trang.
- `mocks`: chứa dữ liệu phục vụ thiết kế và phát triển. Dữ liệu mock không được trộn với API service dùng cho môi trường thật.
- `pages`: chứa các màn hình tương ứng với từng route. Page có nhiệm vụ kết hợp feature và component dùng chung.
- `routes`: chứa cấu hình định tuyến và các component bảo vệ route.
- `services`: chứa hạ tầng dùng chung như HTTP client, chuẩn hóa lỗi API và lưu token.
- `utils`: chứa các hàm tiện ích thuần có thể tái sử dụng.

Luồng dữ liệu nên đi theo hướng:

```text
trang -> hook/component của tính năng -> service của tính năng -> API client dùng chung -> backend
```

Dữ liệu lấy từ server được quản lý bằng TanStack Query. Trạng thái phiên đăng nhập được quản lý trong auth store. Trạng thái cục bộ của component được quản lý bằng React state hoặc thư viện xử lý form.

## 1. Chọn đúng thư mục

| Thành phần | Thư mục | Ví dụ |
| --- | --- | --- |
| Màn hình gắn với URL | `pages/` | `matches-page.tsx` |
| Khung bao quanh nhiều trang | `layouts/` | `main-layout.tsx` |
| Component nền tảng dùng toàn ứng dụng | `components/ui/` | `button.tsx`, `dialog.tsx` |
| Component hoàn chỉnh dùng ở nhiều tính năng | `components/common/` | `error-boundary.tsx` |
| Component chỉ thuộc một nghiệp vụ | `features/<feature>/components/` | `features/rooms/components/room-card.tsx` |
| Hook dùng riêng cho một nghiệp vụ | `features/<feature>/hooks/` | `features/auth/hooks/use-login.ts` |
| Hook dùng chung toàn ứng dụng | `hooks/` | `use-debounce.ts` |
| Hàm gọi API của một nghiệp vụ | `features/<feature>/services/` | `features/rooms/services/rooms-api.ts` |
| HTTP client và token dùng chung | `services/` | `api-client.ts`, `token-storage.ts` |
| Type của một nghiệp vụ | `features/<feature>/types/` | `room-types.ts` |
| Validation của một nghiệp vụ | `features/<feature>/schemas/` | `room-schema.ts` |
| State toàn cục của một nghiệp vụ | `features/<feature>/store/` | `auth-store.ts` |
| Hàm tiện ích thuần | `utils/` | `format-currency.ts` |
| Giá trị cố định | `constants/` | `routes.ts`, `locations.ts` |
| Dữ liệu giả phục vụ phát triển | `mocks/` | `mocks/data/mock-data.ts` |
| Client của nền tảng bên ngoài | `integrations/` | `integrations/supabase/client.ts` |

Nếu một component chỉ được dùng trong một feature, đặt nó trong feature đó. Chỉ chuyển component lên `components/common` khi có ít nhất hai feature thật sự sử dụng.

## 2. Quy tắc đặt tên

### Tên file và thư mục

Tất cả file và thư mục trong `src` dùng `kebab-case`:

```text
match-card.tsx
profile-form.tsx
use-room-search.ts
room-types.ts
room-schema.ts
auth-store.ts
```

Không dùng các kiểu tên sau:

```text
MatchCard.tsx
match_card.tsx
matchCard.tsx
RoomTypes.ts
```

`App.tsx` là ngoại lệ duy nhất vì đây là tên entry component theo convention của Vite. `main.tsx` vẫn dùng chữ thường.

### Tên component

Component React dùng `PascalCase`:

```tsx
export function MatchCard() {}
export function ProfileForm() {}
```

### Tên hook

Hook luôn bắt đầu bằng `use`:

```ts
useLogin
useMatches
useUpdateProfile
useRoomSearch
```

Tên file tương ứng:

```text
use-login.ts
use-matches.ts
use-update-profile.ts
```

### Tên page và layout

File page kết thúc bằng `-page.tsx`. File layout kết thúc bằng `-layout.tsx`:

```text
login-page.tsx
dashboard-page.tsx
main-layout.tsx
admin-layout.tsx
```

Component export dùng hậu tố `Page` hoặc `Layout`:

```tsx
export default function LoginPage() {}
export function MainLayout() {}
```

### Tên API service

File API kết thúc bằng `-api.ts` và export một object theo tên nghiệp vụ:

```ts
export const roomsApi = {
  search,
  get,
  create,
  update,
  remove,
};
```

Tên hàm mô tả hành động, không lặp lại tên feature:

```ts
roomsApi.search()
roomsApi.create()
authApi.login()
profileApi.updateMine()
```

### Tên type

Type và interface dùng `PascalCase`. Không thêm tiền tố `I`:

```ts
type Room = {};
type SaveRoomRequest = {};
type AuthSession = {};
```

Không dùng:

```ts
interface IRoom {}
type roomType = {};
```

### Hằng số

Hằng số cấp module dùng `UPPER_SNAKE_CASE`:

```ts
const MAX_PROFILE_IMAGES = 6;
const DEFAULT_PAGE_SIZE = 20;
```

Object cấu hình dùng tên mô tả rõ ràng:

```ts
export const ROUTES = {};
export const VN_LOCATIONS = [];
```

### Boolean

Tên boolean bắt đầu bằng `is`, `has`, `can` hoặc `should`:

```ts
isAuthenticated
hasRoom
canSubmit
shouldRefresh
```

### Hàm xử lý sự kiện

Hàm nội bộ bắt đầu bằng `handle`. Prop callback bắt đầu bằng `on`:

```tsx
function handleSubmit() {}

<ProfileForm onSubmit={handleSubmit} />
```

## 3. Khi nào dùng `.tsx` và `.ts`

Dùng `.tsx` khi file có JSX hoặc export React component:

```text
login-page.tsx
match-card.tsx
main-layout.tsx
```

Dùng `.ts` khi file không có JSX:

```text
auth-api.ts
auth-types.ts
auth-store.ts
format-date.ts
routes.ts
```

Không dùng `.tsx` cho file chỉ chứa type, API request hoặc hàm tiện ích.

## 4. Cấu trúc một file component

Thứ tự trình bày trong một file `.tsx`:

1. Import thư viện bên ngoài.
2. Import nội bộ bằng alias `@/`.
3. Type của props.
4. Hằng số nhỏ chỉ dùng trong file.
5. Component chính.
6. Component phụ nhỏ chỉ dùng trong file.

```tsx
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Room } from "../types/room-types";

type RoomCardProps = {
  room: Room;
  onSelect?: (roomId: string) => void;
};

export function RoomCard({ room, onSelect }: RoomCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  function handleSelect() {
    onSelect?.(room.id);
  }

  return (
    <article>
      <h2>{room.title}</h2>
      <Button onClick={handleSelect}>Xem phòng</Button>
      <Button onClick={() => setIsExpanded((value) => !value)}>Chi tiết</Button>
    </article>
  );
}
```

Không định nghĩa type props trực tiếp và quá dài bên trong tham số hàm. Không đặt request API trực tiếp trong component nếu request đó có thể tách thành service và hook.

## 5. Trách nhiệm của page

Page chịu trách nhiệm:

- Ghép layout và component của các feature.
- Đọc route parameter và query parameter.
- Thiết lập tiêu đề hoặc metadata của màn hình.
- Xử lý điều hướng cấp trang.

Page không nên chứa:

- Hàm gọi `fetch` dài.
- Toàn bộ type của nghiệp vụ.
- Dữ liệu mock hàng trăm dòng.
- Nhiều component lớn không dùng ở nơi khác.
- Luật nghiệp vụ thuộc backend.

```tsx
export default function MatchesPage() {
  return (
    <MainLayout>
      <MatchFilters />
      <MatchList />
    </MainLayout>
  );
}
```

Nếu một file page vượt khoảng 250 dòng, cần xem xét tách form, danh sách, card, dialog hoặc section sang feature tương ứng. Con số này là tín hiệu review, không phải giới hạn bắt buộc.

## 6. Cấu trúc một feature

Một feature đầy đủ có thể có cấu trúc:

```text
features/rooms/
├── components/
│   ├── room-card.tsx
│   ├── room-filters.tsx
│   └── room-form.tsx
├── hooks/
│   ├── use-room.ts
│   ├── use-rooms.ts
│   └── use-save-room.ts
├── schemas/
│   └── room-schema.ts
├── services/
│   └── rooms-api.ts
├── store/
│   └── room-filter-store.ts
├── types/
│   └── room-types.ts
└── index.ts
```

Chỉ tạo thư mục khi feature thật sự có nội dung tương ứng. Không tạo hàng loạt thư mục rỗng để giống mẫu.

`index.ts` là API công khai của feature:

```ts
export { roomsApi } from "./services/rooms-api";
export type { Room, RoomSearch, SaveRoomRequest } from "./types/room-types";
```

Code bên ngoài feature nên import từ `index.ts` khi phù hợp. Code nội bộ feature có thể import trực tiếp bằng đường dẫn tương đối để tránh vòng lặp dependency.

## 7. Quy tắc phụ thuộc giữa các tầng

Hướng phụ thuộc được phép:

```text
app/routes/pages
       ↓
features/layouts/components
       ↓
services/hooks/utils/constants
```

Quy tắc:

- `services` dùng chung không import từ `pages` hoặc `features`.
- `components/ui` không import business logic từ `features`.
- Một feature không đọc file nội bộ của feature khác bằng đường dẫn sâu.
- Dùng public export của feature khác khi cần chia sẻ.
- Page có thể kết hợp nhiều feature.
- Backend giữ luật nghiệp vụ quan trọng; frontend chỉ kiểm tra để hỗ trợ trải nghiệm người dùng.

## 8. API và dữ liệu server

Không gọi `fetch` trực tiếp trong page. Request đi qua API service:

```ts
// features/rooms/services/rooms-api.ts
export const roomsApi = {
  search: (query: RoomSearch) => apiClient<Room[]>("/api/rooms", { query }),
};
```

Hook dùng TanStack Query để quản lý loading, cache và lỗi:

```ts
export function useRooms(query: RoomSearch) {
  return useQuery({
    queryKey: ["rooms", query],
    queryFn: () => roomsApi.search(query),
  });
}
```

Query key nên là array và bắt đầu bằng tên feature:

```ts
["profile", "me"]
["matches"]
["rooms", filters]
["services", city, district]
```

Mutation thành công phải invalidate hoặc cập nhật cache liên quan.

Không hardcode URL `http://localhost:5000` trong component. Development sử dụng proxy `/api`; production sử dụng nginx cùng origin.

## 9. Quản lý state

| Loại state | Công cụ |
| --- | --- |
| Dữ liệu lấy từ API | TanStack Query |
| User, access token và trạng thái đăng nhập | Zustand auth store |
| Form | React Hook Form |
| Validation form | Zod |
| Modal, tab và trạng thái nhỏ trong component | `useState` |
| Giá trị cần xuất hiện trong URL | Route parameter hoặc search parameter |

Không sao chép dữ liệu API vào Zustand nếu TanStack Query đã quản lý dữ liệu đó.

## 10. Form và validation

Schema validation đặt trong feature:

```text
features/auth/schemas/login-schema.ts
features/profile/schemas/profile-schema.ts
```

Tên schema kết thúc bằng `Schema`:

```ts
export const loginSchema = z.object({});
export type LoginFormValues = z.infer<typeof loginSchema>;
```

Frontend validation giúp hiển thị lỗi sớm. Backend vẫn phải kiểm tra lại toàn bộ dữ liệu.

## 11. Import

Import nội bộ dùng alias `@/`:

```ts
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/api-client";
```

Import tương đối chỉ nên dùng giữa các file gần nhau trong cùng feature:

```ts
import type { Room } from "../types/room-types";
```

Không dùng đường dẫn tương đối dài:

```ts
import { Button } from "../../../../components/ui/button";
```

## 12. CSS và giao diện

- Ưu tiên Tailwind utility class.
- Dùng component trong `components/ui` trước khi tạo primitive mới.
- Dùng hàm `cn` khi cần ghép class có điều kiện.
- Không lặp lại chuỗi class dài ở nhiều nơi; tách thành component hoặc variant.
- Màu sắc, khoảng cách và typography phải theo design system của dự án.
- Component tương tác phải hỗ trợ bàn phím, label và trạng thái focus.
- Hình ảnh phải có `alt`; nút chỉ có icon phải có `aria-label`.

## 13. Supabase và tích hợp bên ngoài

Supabase hiện được giữ tại:

```text
integrations/supabase/
```

Không đưa Supabase client vào `services/api-client.ts`. Hai phần có ranh giới riêng:

- `services/api-client.ts`: giao tiếp với backend ASP.NET Core.
- `integrations/supabase`: giao tiếp trực tiếp với Supabase nếu dự án quyết định sử dụng.

Trước khi quyết định backend chính thức, không xây thêm logic nghiệp vụ phụ thuộc sâu vào Supabase.

## 14. Test

Tên file test đặt cạnh file được kiểm tra hoặc trong thư mục `__tests__` của feature:

```text
room-card.test.tsx
use-login.test.ts
rooms-api.test.ts
```

Tên test mô tả hành vi người dùng hoặc kết quả nghiệp vụ:

```ts
it("hiển thị lỗi khi email không hợp lệ", () => {});
it("làm mới danh sách phòng sau khi tạo thành công", () => {});
```

## 15. Checklist khi tạo code mới

- File đã được đặt đúng `page`, `feature`, `component`, `service` hoặc `utils` chưa?
- Tên file đã dùng `kebab-case` chưa?
- File có JSX mới dùng `.tsx` chưa?
- Component và type đã dùng `PascalCase` chưa?
- Hook đã bắt đầu bằng `use` chưa?
- Boolean đã bắt đầu bằng `is`, `has`, `can` hoặc `should` chưa?
- Page có đang chứa API request hoặc business logic quá lớn không?
- Dữ liệu server đã dùng TanStack Query chưa?
- Form đã có schema validation chưa?
- URL backend có bị hardcode trong component không?
- Component có hỗ trợ label, bàn phím và focus không?
- Đã chạy `npm run lint`, `npx tsc --noEmit` và `npm run build` chưa?
