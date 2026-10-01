const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export type AuthSession = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

export async function apiRequest<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail || `Yêu cầu thất bại (${response.status}).`);
  }

  if (!response.headers.get("Content-Type")?.includes("application/json")) {
    throw new Error("Backend API chưa được cấu hình cho website này.");
  }
  return response.json() as Promise<T>;
}

export function sessionUser(session: AuthSession) {
  return {
    id: session.user.id,
    name: session.user.displayName,
    email: session.user.email,
    avatar: session.user.avatarUrl || "https://api.dicebear.com/9.x/avataaars/svg?seed=Me",
  };
}
