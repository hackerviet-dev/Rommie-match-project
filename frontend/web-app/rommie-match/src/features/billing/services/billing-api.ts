import { apiClient } from "@/services/api-client";
import type { Checkout, Payment, Subscription } from "../types/billing-types";

export const billingApi = {
  health: () => apiClient<{ provider: string }>("/api/billing/health"),
  subscription: () =>
    apiClient<Subscription>("/api/billing/me/subscription", { authenticated: true }),
  checkout: (planCode: string) =>
    apiClient<Checkout>("/api/billing/checkout", {
      method: "POST",
      body: { planCode },
      authenticated: true,
    }),
  payments: () => apiClient<Payment[]>("/api/billing/payments", { authenticated: true }),
  payment: (paymentId: string) =>
    apiClient<Payment>(`/api/billing/payments/${encodeURIComponent(paymentId)}`, {
      authenticated: true,
    }),
};
