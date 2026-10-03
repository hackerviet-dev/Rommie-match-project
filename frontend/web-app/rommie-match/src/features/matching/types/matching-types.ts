export type RoommateMatch = {
  id: string;
  name: string;
  age: number | null;
  occupation: string | null;
  city: string;
  district: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  score: number;
  breakdown: { key: string; label: string; value: number; weight: number }[];
  isBoosted: boolean;
  explanation: string | null;
  budgetMin: number;
  budgetMax: number;
  interests: string[];
};

export type MatchRecalculation = {
  candidatesScored: number;
  matches: import("@/services/paging").Page<RoommateMatch>;
};
export type MatchUsage = {
  isPremium: boolean;
  scansUsed: number;
  scansLimit: number | null;
  scansRemaining: number | null;
  boostsUsed: number;
  boostsLimit: number;
  activeBoost: { id: string; endsAt: string } | null;
  periodResetsAt: string;
};
export type MatchFilters = {
  page?: number;
  pageSize?: number;
  q?: string;
  city?: string;
  minScore?: number;
  sameCity?: boolean;
  petFriendly?: boolean;
  nonSmoking?: boolean;
  moveInBy?: string;
  budgetMin?: number;
  budgetMax?: number;
  district?: string;
  roomEnvironment?: string;
  minCleanliness?: number;
  verifiedOnly?: boolean;
};
export type MatchDetail = {
  match: RoommateMatch;
  bio: string | null;
  sharedInterests: string[];
  calculatedAt: string;
  comparisonLocked: boolean;
  comparison:
    { key: string; label: string; mine: string; theirs: string }[] | null;
};
export type MatchRequest = {
  id: string;
  direction: string;
  partner: { userId: string; displayName: string; avatarUrl: string | null };
  message: string | null;
  status: string;
  isBlocked: boolean;
};
