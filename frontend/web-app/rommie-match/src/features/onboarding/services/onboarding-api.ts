import { apiClient } from "@/services/api-client";
import type { OnboardingValues } from "../schemas/onboarding-schema";

export const onboardingApi = {
  getStatus: () => apiClient<{ isComplete: boolean }>("/api/users/me/onboarding", { authenticated: true }),
  complete: (values: OnboardingValues & { amenities: string[] }) => apiClient<{ isComplete: boolean }>("/api/users/me/onboarding", { method: "PUT", body: values, authenticated: true }),
};
