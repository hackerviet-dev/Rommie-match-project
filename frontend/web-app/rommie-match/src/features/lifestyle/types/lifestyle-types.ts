export type LifestylePreferences = {
  userId: string;
  sleepSchedule: string;
  cleanliness: number;
  socialStyle: string;
  smoking: boolean;
  petFriendly: boolean;
  cookingFrequency: string | null;
  budgetMin: number;
  budgetMax: number;
  moveInDate: string | null;
  interests: string[];
  updatedAt: string;
};

export type SaveLifestyleRequest = Omit<LifestylePreferences, "userId" | "updatedAt">;
