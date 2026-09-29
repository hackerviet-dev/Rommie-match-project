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
  amenities: string[];
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SaveRoomRequest = Omit<
  Room,
  "id" | "ownerUserId" | "ownerDisplayName" | "ownerAvatarUrl" | "createdAt" | "updatedAt"
>;

export type RoomSearch = {
  city?: string;
  district?: string;
  maxRent?: number;
  availableBy?: string;
};
