export type RoommateMatch = {
  id: string;
  name: string;
  age: number;
  occupation: string | null;
  city: string;
  district: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  score: number;
  breakdown: string;
  explanation: string | null;
  budgetMin: number;
  budgetMax: number;
  interests: string[];
};

export type MatchRecalculation = {
  candidatesScored: number;
  matches: RoommateMatch[];
};
