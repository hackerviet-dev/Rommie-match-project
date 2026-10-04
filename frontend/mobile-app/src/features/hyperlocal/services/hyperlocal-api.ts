import { tokenStorage } from "@/services/token-storage";
import { apiClient } from "@/services/api-client";
import type { LocalService, SaveLocalServiceRequest } from "../types/hyperlocal-types";
import { queryString, type Page } from "@/services/paging";

export const hyperlocalApi = {
  list: (city = "TP.HCM", district?: string, category?: string, page = 1, q?: string) => {
    return apiClient<Page<LocalService>>(
      `/api/hyperlocal/services${queryString({ city, district, category, page, q })}`,
      { authenticated: Boolean(tokenStorage.getAccessToken()) },
    );
  },
  get: (serviceId: string) =>
    apiClient<LocalService>(`/api/hyperlocal/services/${encodeURIComponent(serviceId)}`, {
      authenticated: Boolean(tokenStorage.getAccessToken()),
    }),
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
