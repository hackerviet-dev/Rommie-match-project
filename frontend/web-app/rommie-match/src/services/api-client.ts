import { ApiError } from "./api-error";
import { tokenStorage } from "./token-storage";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const details = await response.json().catch(() => undefined);
    const message =
      typeof details === "object" && details !== null && "detail" in details
        ? String(details.detail)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, details);
  }

  if (response.status === 204) return undefined as T;
  if (!response.headers.get("Content-Type")?.includes("application/json")) {
    throw new ApiError("Backend API chưa được cấu hình cho website này.", response.status);
  }
  return response.json() as Promise<T>;
}
