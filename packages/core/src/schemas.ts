import { z } from "zod";

// ---------------------------------------------------------------------------
// Domain Models
// ---------------------------------------------------------------------------

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
  label: z.string().optional(),
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

// ---------------------------------------------------------------------------
// API Contract: POST /routes/directions
// ---------------------------------------------------------------------------

export const RoutingProfileSchema = z.enum(["driving", "walking", "cycling"]);

export const DirectionsRequestSchema = z.object({
  profile: RoutingProfileSchema,
  coordinates: z
    .array(z.tuple([z.number(), z.number()]))
    .min(2, "At least origin and destination required"),
  alternatives: z.boolean(),
  avoid: z
    .object({
      tolls: z.boolean().optional(),
      ferries: z.boolean().optional(),
      highways: z.boolean().optional(),
    })
    .optional(),
});

export const RouteSummarySchema = z.object({
  totalDistance: z.number().nonnegative(),
  totalDuration: z.number().nonnegative(),
  legCount: z.number().int().nonnegative(),
  stepCount: z.number().int().nonnegative(),
});

export const DirectionsResponseSchema = z.object({
  summary: z.array(RouteSummarySchema),
  geojson: z.object({
    routeLines: z.unknown(),
    segments: z.unknown(),
    bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  }),
});
