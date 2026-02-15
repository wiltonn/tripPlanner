import { z } from "zod";

// ---------------------------------------------------------------------------
// Tracked<T> — provenance wrapper for every user-facing value
// ---------------------------------------------------------------------------

export const ProvenanceSchema = z.enum([
  "user-confirmed",
  "user-entered",
  "ai-proposed",
  "system-derived",
]);

export type Provenance = z.infer<typeof ProvenanceSchema>;

export function TrackedSchema<T extends z.ZodTypeAny>(inner: T) {
  return z.object({
    value: inner,
    provenance: ProvenanceSchema,
    updatedAt: z.string(),
    note: z.string().optional(),
  });
}

export type Tracked<T> = {
  value: T;
  provenance: Provenance;
  updatedAt: string;
  note?: string;
};

export function tracked<T>(
  value: T,
  provenance: Provenance = "user-entered"
): Tracked<T> {
  return { value, provenance, updatedAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Facet: Skeleton
// ---------------------------------------------------------------------------

export const TripSkeletonSchema = z.object({
  name: TrackedSchema(z.string().min(1)).nullable(),
  startDate: TrackedSchema(z.string()).nullable(),
  endDate: TrackedSchema(z.string()).nullable(),
  arrivalAirport: TrackedSchema(z.string()).nullable(),
  departureAirport: TrackedSchema(z.string()).nullable(),
  partySize: TrackedSchema(z.number().int().positive()).nullable(),
  partyDescription: TrackedSchema(z.string()).nullable(),
});

export type TripSkeleton = z.infer<typeof TripSkeletonSchema>;

// ---------------------------------------------------------------------------
// Facet: Bases (lodging)
// ---------------------------------------------------------------------------

export const BaseSchema = z.object({
  id: z.string(),
  name: TrackedSchema(z.string()),
  location: TrackedSchema(z.tuple([z.number(), z.number()])),
  nights: TrackedSchema(z.number().int().nonnegative()),
  checkIn: TrackedSchema(z.string()).nullable(),
  checkOut: TrackedSchema(z.string()).nullable(),
  booked: TrackedSchema(z.boolean()),
  costPerNight: TrackedSchema(z.number().nonnegative()).nullable(),
});

export type Base = z.infer<typeof BaseSchema>;

// ---------------------------------------------------------------------------
// Facet: Activities
// ---------------------------------------------------------------------------

export const TimeBlockSchema = z.enum(["morning", "afternoon", "evening", "flexible"]);
export type TimeBlock = z.infer<typeof TimeBlockSchema>;

export const PrioritySchema = z.enum(["must-do", "nice-to-have", "if-time"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const ActivitySchema = z.object({
  id: z.string(),
  name: TrackedSchema(z.string()),
  location: TrackedSchema(z.tuple([z.number(), z.number()])),
  dayIndex: TrackedSchema(z.number().int().nonnegative()).nullable(),
  timeBlock: TrackedSchema(TimeBlockSchema).nullable(),
  priority: TrackedSchema(PrioritySchema),
  duration: TrackedSchema(z.number().positive()).nullable(),
  cost: TrackedSchema(z.number().nonnegative()).nullable(),
});

export type Activity = z.infer<typeof ActivitySchema>;

// ---------------------------------------------------------------------------
// Facet: Daily Schedules
// ---------------------------------------------------------------------------

export const DayScheduleSchema = z.object({
  dayIndex: z.number().int().nonnegative(),
  baseId: z.string().nullable(),
  morning: z.array(z.string()),
  afternoon: z.array(z.string()),
  evening: z.array(z.string()),
});

export type DaySchedule = z.infer<typeof DayScheduleSchema>;

// ---------------------------------------------------------------------------
// Facet: Drive Legs
// ---------------------------------------------------------------------------

export const DriveLegSchema = z.object({
  id: z.string(),
  fromId: z.string(),
  toId: z.string(),
  distance: TrackedSchema(z.number().nonnegative()).nullable(),
  duration: TrackedSchema(z.number().nonnegative()).nullable(),
  departBy: TrackedSchema(z.string()).nullable(),
  routeGeojson: z.unknown().nullable(),
});

export type DriveLeg = z.infer<typeof DriveLegSchema>;

// ---------------------------------------------------------------------------
// Facet: Budget
// ---------------------------------------------------------------------------

export const BudgetCategorySchema = z.object({
  category: z.string(),
  estimated: TrackedSchema(z.number().nonnegative()).nullable(),
  actual: TrackedSchema(z.number().nonnegative()).nullable(),
});

export type BudgetCategory = z.infer<typeof BudgetCategorySchema>;

// ---------------------------------------------------------------------------
// Facet: Finalization
// ---------------------------------------------------------------------------

export const FinalizationSchema = z.object({
  emergencyContact: TrackedSchema(z.string()).nullable(),
  packingList: z.array(z.string()),
  offlineNotes: z.array(z.string()),
  confirmations: z.array(z.string()),
});

export type Finalization = z.infer<typeof FinalizationSchema>;

// ---------------------------------------------------------------------------
// PlanContext — the full trip planning state
// ---------------------------------------------------------------------------

export const PlanContextSchema = z.object({
  skeleton: TripSkeletonSchema,
  bases: z.array(BaseSchema),
  activities: z.array(ActivitySchema),
  dailySchedules: z.array(DayScheduleSchema),
  driveLegs: z.array(DriveLegSchema),
  budget: z.array(BudgetCategorySchema),
  finalization: FinalizationSchema,
});

export type PlanContext = z.infer<typeof PlanContextSchema>;

// ---------------------------------------------------------------------------
// Overlay IDs
// ---------------------------------------------------------------------------

export const OVERLAY_IDS = [
  "itinerary",
  "activities",
  "lodging",
  "driving",
  "budget",
] as const;

export type OverlayId = (typeof OVERLAY_IDS)[number];

// ---------------------------------------------------------------------------
// Map Focus — what the map should fly to
// ---------------------------------------------------------------------------

export const MapFocusSchema = z.object({
  type: z.enum(["base", "activity", "driveLeg", "day"]),
  id: z.string().optional(),
  coordinates: z.tuple([z.number(), z.number()]).optional(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
});

export type MapFocus = z.infer<typeof MapFocusSchema>;

// ---------------------------------------------------------------------------
// Factory: empty PlanContext
// ---------------------------------------------------------------------------

export function emptyPlanContext(): PlanContext {
  return {
    skeleton: {
      name: null,
      startDate: null,
      endDate: null,
      arrivalAirport: null,
      departureAirport: null,
      partySize: null,
      partyDescription: null,
    },
    bases: [],
    activities: [],
    dailySchedules: [],
    driveLegs: [],
    budget: [],
    finalization: {
      emergencyContact: null,
      packingList: [],
      offlineNotes: [],
      confirmations: [],
    },
  };
}
