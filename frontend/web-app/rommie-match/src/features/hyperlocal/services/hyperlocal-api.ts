import { apiClient } from "@/services/api-client";
import type { LocalService, SaveLocalServiceRequest } from "../types/hyperlocal-types";

export const hyperlocalApi = {
  list: (city: string, district?: string) => {
    const query = new URLSearchParams({ city });
    if (district) query.set("district", district);
    return apiClient<LocalService[]>(`/api/hyperlocal/services?${query}`);
  },
  get: (serviceId: string) =>
    apiClient<LocalService>(`/api/hyperlocal/services/${encodeURIComponent(serviceId)}`),
  create: (request: SaveLocalServiceRequest) =>
    apiClient<LocalService>("/api/hyperlocal/services", {
      method: "POST",
      body: request,
      authenticated: true,
    }),
  update: (serviceId: string, request: SaveLocalServiceRequest) =>
    apiClient<LocalService>(`/api/hyperlocal/services/${encodeURIComponent(serviceId)}`, {
      method: "PUT",
      body: request,
      authenticated: true,
    }),
  remove: (serviceId: string) =>
    apiClient<void>(`/api/hyperlocal/services/${encodeURIComponent(serviceId)}`, {
      method: "DELETE",
      authenticated: true,
    }),
};
