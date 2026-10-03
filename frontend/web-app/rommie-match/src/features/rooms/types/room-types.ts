export type Room = {
  id: string;
  ownerUserId: string;
  ownerDisplayName: string;
  ownerAvatarUrl: string | null;
  title: string;
  description: string | null;
  address: string;
  district: string;
  city: string;
  monthlyRent: number;
  deposit: number;
  availableFrom: string;
  maxOccupants: number;
  propertyType: string | null;
  bedrooms: number | null;
  areaM2: number | null;
  roommatesNeeded: number | null;
  amenities: string[];
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SaveRoomRequest = Omit<
  Room,
  | "id"
  | "ownerUserId"
  | "ownerDisplayName"
  | "ownerAvatarUrl"
  | "createdAt"
  | "updatedAt"
>;

export type RoomSearch = {
  page?: number;
  pageSize?: number;
  city?: string;
  district?: string;
  maxRent?: number;
  availableBy?: string;
};
