import { API_BASE_URL } from "./api-base-url";
import { ApiError } from "./api-error";
import { tokenStorage } from "./token-storage";

export { API_BASE_URL };

// Gói miễn phí của Render ngủ khi không có người dùng, lần gọi đầu mất 30–60 giây để khởi động.
const REQUEST_TIMEOUT_MS = 75_000;

// fetch có giới hạn thời gian: trên điện thoại, sai IP thường treo thay vì lỗi ngay.
async function send(input: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch {
    throw new ApiError(`Không kết nối được máy chủ (${API_BASE_URL}).`, 0);
  } finally {
    clearTimeout(timer);
  }
}

let refreshRequest: Promise<void> | null = null;
async function refreshSession() {
  if (!refreshRequest) {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) throw new ApiError("Vui lòng đăng nhập lại.", 401);
    refreshRequest = (async () => {
      const response = await send(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        if (response.status === 401 && tokenStorage.getRefreshToken() === refreshToken)
          tokenStorage.clear();
        throw new ApiError("Không thể khôi phục phiên đăng nhập.", response.status);
      }
      const session = await response.json();
      // A logout or a new login must not be undone by a late refresh response.
      if (tokenStorage.getRefreshToken() !== refreshToken)
        throw new ApiError("Phiên đăng nhập đã thay đổi.", 401);
      tokenStorage.setTokens(session.accessToken, session.refreshToken);
    })().finally(() => {
      refreshRequest = null;
    });
  }
  return refreshRequest;
}

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  authenticated?: boolean;
};

export async function apiClient<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, authenticated = false, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);

  if (body !== undefined) requestHeaders.set("Content-Type", "application/json");
  if (authenticated) {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const request = () =>
    send(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  let response = await request();
  if (authenticated && response.status === 401) {
    if (
      requestHeaders.get("Authorization") === `Bearer ${tokenStorage.getAccessToken()}` ||
      !tokenStorage.getAccessToken()
    )
      await refreshSession();
    requestHeaders.set("Authorization", `Bearer ${tokenStorage.getAccessToken()}`);
    response = await request();
    if (response.status === 401) tokenStorage.clear();
  }
  if (!response.ok) {
    const details = await response.json().catch(() => undefined);
    const message =
      typeof details === "object" && details !== null && "detail" in details
        ? String(details.detail)
        : typeof details === "object" && details !== null && "errors" in details
          ? Object.values(details.errors as Record<string, string[]>)
              .flat()
              .join(" ")
          : `Yêu cầu thất bại (${response.status}).`;
    throw new ApiError(message, response.status, details);
  }

  if (response.status === 204) return undefined as T;
  if (!response.headers.get("Content-Type")?.includes("application/json")) {
    throw new ApiError("Máy chủ trả về dữ liệu không phải JSON.", response.status);
  }
  return response.json() as Promise<T>;
}
