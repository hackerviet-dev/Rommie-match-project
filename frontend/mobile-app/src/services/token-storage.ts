import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "roomiematch-access-token";
const REFRESH_TOKEN_KEY = "roomiematch-refresh-token";

// Token được giữ trong bộ nhớ để apiClient đọc đồng bộ như bản web, và lưu bền vào
// SecureStore (Keychain/Keystore). Bản web của Expo chỉ dùng để thử nên lưu localStorage.
const store =
  Platform.OS === "web"
    ? {
        get: async (key: string) => globalThis.localStorage?.getItem(key) ?? null,
        set: async (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
        remove: async (key: string) => globalThis.localStorage?.removeItem(key),
      }
    : {
        get: (key: string) => SecureStore.getItemAsync(key),
        set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        remove: (key: string) => SecureStore.deleteItemAsync(key),
      };

let accessToken: string | null = null;
let refreshToken: string | null = null;
let loaded: Promise<void> | null = null;
// Ghi tuần tự để một lần đăng xuất không bị lần lưu token cũ chạy chậm ghi đè.
let writes: Promise<unknown> = Promise.resolve();
const sessionEndedListeners = new Set<() => void>();

function persist(write: () => Promise<unknown>) {
  writes = writes.then(write).catch(() => {
    // Lưu thất bại chỉ làm mất phiên ở lần mở app sau; phiên hiện tại vẫn dùng được.
  });
}

export const tokenStorage = {
  load: () => {
    loaded ??= (async () => {
      const [access, refresh] = await Promise.all([
        store.get(ACCESS_TOKEN_KEY).catch(() => null),
        store.get(REFRESH_TOKEN_KEY).catch(() => null),
      ]);
      // Một lần đăng nhập xảy ra trong lúc đang đọc thì giữ token mới.
      if (accessToken === null && refreshToken === null) {
        accessToken = access;
        refreshToken = refresh;
      }
    })();
    return loaded;
  },
  getAccessToken: () => accessToken,
  getRefreshToken: () => refreshToken,
  setTokens: (access: string, refresh: string) => {
    accessToken = access;
    refreshToken = refresh;
    persist(() =>
      Promise.all([store.set(ACCESS_TOKEN_KEY, access), store.set(REFRESH_TOKEN_KEY, refresh)]),
    );
  },
  clear: () => {
    accessToken = null;
    refreshToken = null;
    persist(() => Promise.all([store.remove(ACCESS_TOKEN_KEY), store.remove(REFRESH_TOKEN_KEY)]));
    for (const listener of sessionEndedListeners) listener();
  },
  onSessionEnded: (listener: () => void) => {
    sessionEndedListeners.add(listener);
    return () => {
      sessionEndedListeners.delete(listener);
    };
  },
};
