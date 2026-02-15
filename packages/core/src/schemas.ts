import { z } from "zod";

export const TripSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const DayPlanSchema = z.object({
  id: z.string().uuid(),
  tripId: z.string().uuid(),
  date: z.coerce.date(),
  dayNumber: z.number().int().positive(),
  notes: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const PlaceSchema = z.object({
  id: z.string().uuid(),
  dayPlanId: z.string().uuid(),
  name: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional(),
  category: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const RouteAlternativeSchema = z.object({
  id: z.string().uuid(),
  routeId: z.string().uuid(),
  geometry: z.unknown(),
  distanceMeters: z.number().nonnegative(),
  durationSeconds: z.number().nonnegative(),
  provider: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const RouteSchema = z.object({
  id: z.string().uuid(),
  dayPlanId: z.string().uuid(),
  originPlaceId: z.string().uuid(),
  destPlaceId: z.string().uuid(),
  selectedAlternativeId: z.string().uuid().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const DirectionsRequestSchema = z.object({
  origin: z.object({ lat: z.number(), lng: z.number() }),
  destination: z.object({ lat: z.number(), lng: z.number() }),
});

export const DirectionsResponseSchema = z.object({
  geometry: z.object({
    type: z.literal("LineString"),
    coordinates: z.array(z.tuple([z.number(), z.number()])),
  }),
  distanceMeters: z.number(),
  durationSeconds: z.number(),
});
