export type Profile = {
  userId: string;
  displayName: string;
  birthDate: string | null;
  gender: string | null;
  occupation: string | null;
  bio: string | null;
  city: string;
  district: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  profileCompletion: number;
  updatedAt: string;
};

export type UpdateProfileRequest = Pick<
  Profile,
  "displayName" | "birthDate" | "gender" | "occupation" | "bio" | "city" | "district" | "avatarUrl"
>;
