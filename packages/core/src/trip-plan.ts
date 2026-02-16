import { z } from "zod";
import { PlanContextSchema } from "./plan-context";

/** DB row schema (snake_case, matches Supabase columns) */
export const TripPlanSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  destination: z.string(),
  nights: z.number().int().positive(),
  travelers: z.string(),
  airport: z.string(),
  trip_style: z.string(),
  budget: z.string(),
  status: z.string().default("draft"),
  bases: z.array(z.unknown()).default([]),
  plan_context: PlanContextSchema.nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type TripPlan = z.infer<typeof TripPlanSchema>;

/** Chat intake schema (camelCase, for client form output) */
export const TripIntakeSchema = z.object({
  destination: z.string().min(1, "Destination is required"),
  nights: z.number().int().positive("Must be at least 1 night"),
  travelers: z.string().min(1, "Travelers info is required"),
  airport: z.string().min(1, "Airport is required"),
  tripStyle: z.string().min(1, "Trip style is required"),
  budget: z.string().min(1, "Budget is required"),
});

export type TripIntake = z.infer<typeof TripIntakeSchema>;
