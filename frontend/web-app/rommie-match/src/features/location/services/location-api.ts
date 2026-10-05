import { apiClient } from "@/services/api-client";

export type RoomLocation = {
  address: string;
  district: string;
  city: string;
  latitude: number;
  longitude: number;
  placeId?: string | null;
};
export type MapsConfig = { browserApiKey: string; mapId: string; geocodingEnabled: boolean };
export const locationApi = {
  config: () => apiClient<MapsConfig>("/api/geo/config", { authenticated: true }),
  reverse: (latitude: number, longitude: number) => apiClient<RoomLocation>(`/api/geo/reverse?latitude=${latitude}&longitude=${longitude}`, { authenticated: true }),
  resolveLink: (link: string) => apiClient<RoomLocation>("/api/geo/resolve-link", { method: "POST", body: { link }, authenticated: true }),
};
