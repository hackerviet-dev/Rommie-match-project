export type StaffUser = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
  isPremium: boolean;
  isVerified: boolean;
};
export type StaffUserDetail = Omit<
  StaffUser,
  "displayName" | "avatarUrl" | "city" | "isVerified"
> & {
  createdAt: string;
  roomCount: number;
  reportCount: number;
  profile: {
    display_name: string;
    occupation: string | null;
    bio: string | null;
    city: string | null;
    district: string | null;
    gender: string | null;
    birth_year: number | null;
    birth_date: string | null;
    organization_name: string | null;
    hide_organization: boolean;
    is_verified: boolean;
    onboarding_completed_at: string | null;
    profile_completion: number;
  } | null;
  lifestyle: Record<string, unknown> | null;
};
export type StaffRoom = {
  id: string;
  title: string;
  description: string | null;
  address: string;
  city: string;
  district: string;
  monthlyRent: number;
  deposit: number;
  propertyType: string | null;
  bedrooms: number | null;
  areaM2: number | null;
  maxOccupants: number;
  roommatesNeeded: number | null;
  availableFrom: string;
  amenities: string[];
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  ownerUserId: string;
  ownerName: string;
  status: string;
  note: string | null;
  updatedAt: string;
};
export type Audit = {
  id: string;
  action: string;
  targetId: string;
  note: string;
  created_at: string;
  actorName: string | null;
};
