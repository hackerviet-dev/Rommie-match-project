import type { OnboardingValues } from "@/features/onboarding";
import type { LifestylePreferences } from "@/features/lifestyle";

export type Profile = {
  userId: string;
  displayName: string;
  birthDate: string | null;
  birthYear?: number | null;
  gender: string | null;
  occupation: string | null;
  bio: string | null;
  city: string;
  district: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  profileCompletion: number;
  updatedAt: string;
  occupationStatus?: string | null;
  organizationName?: string | null;
  hideOrganization?: boolean;
  hasRoom?: boolean | null;
  onboardingCompletedAt?: string | null;
  onboarding?: OnboardingValues & { amenities: string[] };
  lifestyle?: LifestylePreferences;
};

export type UpdateProfileRequest = Pick<
  Profile,
  "displayName" | "birthDate" | "gender" | "occupation" | "bio" | "city" | "district" | "avatarUrl"
>;
