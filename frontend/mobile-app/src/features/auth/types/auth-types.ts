export type AuthenticatedUser = {
  id: string;
  email: string;
  role: string;
  displayName: string;
  avatarUrl: string | null;
  city: string;
  district: string | null;
  profileCompletion: number;
};

export type AuthSession = {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: AuthenticatedUser;
};

export type LoginRequest = { email: string; password: string };

export type RegisterRequest = {
  email: string;
  password: string;
  displayName: string;
  city: string;
  district?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  occupation?: string | null;
};
