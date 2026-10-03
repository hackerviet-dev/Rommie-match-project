import { tokenStorage } from "@/services/token-storage";
import { apiClient } from "@/services/api-client";
import type { Room, RoomSearch, SaveRoomRequest } from "../types/room-types";
import type { Page } from "@/services/paging";

function toQuery(search: RoomSearch) {
  const query = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : "";
}

export const roomsApi = {
  search: (search: RoomSearch = {}) =>
    apiClient<Page<Room>>(`/api/rooms${toQuery(search)}`, {
      authenticated: Boolean(tokenStorage.getAccessToken()),
    }),
  get: (roomId: string) =>
    apiClient<Room>(`/api/rooms/${encodeURIComponent(roomId)}`, {
      authenticated: Boolean(tokenStorage.getAccessToken()),
    }),
  mine: () => apiClient<Room[]>("/api/rooms/me", { authenticated: true }),
  create: (request: SaveRoomRequest) =>
    apiClient<Room>("/api/rooms", {
      method: "POST",
      body: request,
      authenticated: true,
    }),
  update: (roomId: string, request: SaveRoomRequest) =>
    apiClient<Room>(`/api/rooms/${encodeURIComponent(roomId)}`, {
      method: "PUT",
      body: request,
      authenticated: true,
    }),
  remove: (roomId: string) =>
    apiClient<void>(`/api/rooms/${encodeURIComponent(roomId)}`, {
      method: "DELETE",
      authenticated: true,
    }),
};
