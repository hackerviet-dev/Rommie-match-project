import { z } from "zod";
export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(180),
  category: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(100),
  district: z.string().trim().min(1).max(100),
  description: z.string().max(2000),
  phone: z.string().max(30),
  priceFrom: z.coerce.number().int().min(0).max(1e9),
  distanceKm: z.coerce.number().min(0),
  rating: z.coerce.number().min(0).max(5),
  reviewCount: z.coerce.number().int().min(0),
  isVerified: z.boolean(),
});
export type ServiceForm = z.infer<typeof serviceSchema>;
