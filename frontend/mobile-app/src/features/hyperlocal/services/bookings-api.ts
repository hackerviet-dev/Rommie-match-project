import { apiClient } from "@/services/api-client";
import type { Page } from "@/services/paging";
export type Booking = {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  servicePhone: string | null;
  scheduledAt: string;
  address: string;
  contactPhone: string;
  note: string | null;
  status: string;
  createdAt: string;
};
export type BookingRequest = {
  scheduledAt: string;
  address: string;
  contactPhone: string;
  note: string;
};
export const bookingsApi = {
  create: (id: string, body: BookingRequest) =>
    apiClient<Booking>(`/api/hyperlocal/services/${id}/bookings`, {
      method: "POST",
      body,
      authenticated: true,
    }),
  list: (page = 1) =>
    apiClient<Page<Booking>>(`/api/hyperlocal/me/bookings?page=${page}`, {
      authenticated: true,
    }),
  get: (id: string) =>
    apiClient<Booking>(`/api/hyperlocal/me/bookings/${id}`, {
      authenticated: true,
    }),
  cancel: (id: string) =>
    apiClient<Booking>(`/api/hyperlocal/me/bookings/${id}/cancel`, {
      method: "POST",
      authenticated: true,
    }),
};
