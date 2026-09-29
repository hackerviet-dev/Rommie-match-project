import { apiClient } from "@/services/api-client";
import type { Room, RoomSearch, SaveRoomRequest } from "../types/room-types";

function toQuery(search: RoomSearch) {
  const query = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : "";
}

export const roomsApi = {
  search: (search: RoomSearch = {}) => apiClient<Room[]>(`/api/rooms${toQuery(search)}`),
  get: (roomId: string) => apiClient<Room>(`/api/rooms/${encodeURIComponent(roomId)}`),
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
