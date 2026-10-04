export type LocalService = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  phone: string | null;
  district: string;
  city: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  isVerified: boolean;
};

export type SaveLocalServiceRequest = Omit<LocalService, "id">;
