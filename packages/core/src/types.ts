import { z } from "zod";
import {
  TripSchema,
  DayPlanSchema,
  PlaceSchema,
  RouteSchema,
  RouteAlternativeSchema,
  RoutingProfileSchema,
  DirectionsRequestSchema,
  DirectionsResponseSchema,
  RouteSummarySchema,
  IsochroneRequestSchema,
  IsochroneContourSchema,
  IsochroneResponseSchema,
} from "./schemas";

export type Trip = z.infer<typeof TripSchema>;
export type DayPlan = z.infer<typeof DayPlanSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type RouteAlternative = z.infer<typeof RouteAlternativeSchema>;
export type RoutingProfile = z.infer<typeof RoutingProfileSchema>;
export type DirectionsRequest = z.infer<typeof DirectionsRequestSchema>;
export type DirectionsResponse = z.infer<typeof DirectionsResponseSchema>;
export type RouteSummary = z.infer<typeof RouteSummarySchema>;
export type IsochroneRequest = z.infer<typeof IsochroneRequestSchema>;
export type IsochroneContour = z.infer<typeof IsochroneContourSchema>;
export type IsochroneResponse = z.infer<typeof IsochroneResponseSchema>;
