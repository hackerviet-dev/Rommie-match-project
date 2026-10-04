import { apiClient } from "@/services/api-client";
import { type Page, queryString } from "@/services/paging";
import { tokenStorage } from "@/services/token-storage";
import type { Room, RoomSearch, SaveRoomRequest } from "../types/room-types";

export const roomsApi = {
  search: (search: RoomSearch = {}) =>
    apiClient<Page<Room>>(`/api/rooms${queryString(search)}`, {
      authenticated: Boolean(tokenStorage.getAccessToken()),
    }),
  get: (roomId: string) =>
    apiClient<Room>(`/api/rooms/${encodeURIComponent(roomId)}`, {
      authenticated: Boolean(tokenStorage.getAccessToken()),
    }),
  mine: () => apiClient<Room[]>("/api/rooms/me", { authenticated: true }),
  create: (request: SaveRoomRequest) =>
    apiClient<Room>("/api/rooms", { method: "POST", body: request, authenticated: true }),
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
