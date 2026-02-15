import { z } from "zod";
import {
  TripSchema,
  DayPlanSchema,
  PlaceSchema,
  RouteSchema,
  RouteAlternativeSchema,
  DirectionsRequestSchema,
  DirectionsResponseSchema,
} from "./schemas";

export type Trip = z.infer<typeof TripSchema>;
export type DayPlan = z.infer<typeof DayPlanSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type RouteAlternative = z.infer<typeof RouteAlternativeSchema>;
export type DirectionsRequest = z.infer<typeof DirectionsRequestSchema>;
export type DirectionsResponse = z.infer<typeof DirectionsResponseSchema>;
