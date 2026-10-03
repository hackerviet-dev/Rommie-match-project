const ACCESS_TOKEN_KEY = "roomiematch-access-token";
const REFRESH_TOKEN_KEY = "roomiematch-refresh-token";
export const SESSION_ENDED_KEY = "roomiematch-session-ended";

export const tokenStorage = {
  getAccessToken: () => sessionStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => sessionStorage.getItem(REFRESH_TOKEN_KEY),
  setAccessToken: (accessToken: string) => sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
  setTokens: (accessToken: string, refreshToken: string) => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: (broadcast = true) => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.dispatchEvent(new Event("roomiematch-session-ended"));
    if (broadcast) localStorage.setItem(SESSION_ENDED_KEY, crypto.randomUUID());
  },
};
