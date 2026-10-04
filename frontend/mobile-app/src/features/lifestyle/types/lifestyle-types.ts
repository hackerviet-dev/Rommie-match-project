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
  roomEnvironment?: string | null;
  drinking?: boolean | null;
  extroversion?: number | null;
  preferredDistance?: string | null;
  preferredRoomType?: string | null;
};

export type SaveLifestyleRequest = Omit<LifestylePreferences, "userId" | "updatedAt">;
