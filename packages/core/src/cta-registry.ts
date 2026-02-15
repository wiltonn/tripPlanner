import type { PlanContext, OverlayId } from "./plan-context";

// ---------------------------------------------------------------------------
// CTA Definition
// ---------------------------------------------------------------------------

export type CTAActionType = "prompt" | "navigate" | "compute" | "confirm";

export interface CTADefinition {
  id: string;
  label: string;
  facet: string;
  preconditions: (ctx: PlanContext) => boolean;
  isEligible: (ctx: PlanContext, focus: OverlayId | null) => boolean;
  score: (ctx: PlanContext) => number;
  rationale: (ctx: PlanContext) => string;
  effect: string;
  aiAssist?: boolean;
  actionType: CTAActionType;
}

// ---------------------------------------------------------------------------
// Initial 5 CTAs — Walking Skeleton
// ---------------------------------------------------------------------------

export const ctaRegistry: CTADefinition[] = [
  {
    id: "set-trip-dates",
    label: "Set travel dates",
    facet: "skeleton",
    preconditions: () => true,
    isEligible: (ctx, focus) =>
      !ctx.skeleton.startDate && (focus === null || focus === "itinerary"),
    score: (ctx) => (ctx.skeleton.startDate ? 0 : 95),
    rationale: () => "Dates unlock day-by-day planning and lodging search",
    effect: "Sets skeleton.startDate and skeleton.endDate",
    actionType: "prompt",
  },
  {
    id: "add-first-base",
    label: "Add your first stay",
    facet: "bases",
    preconditions: (ctx) => ctx.skeleton.startDate !== null,
    isEligible: (ctx, focus) =>
      ctx.bases.length === 0 && (focus === null || focus === "itinerary" || focus === "lodging"),
    score: (ctx) => (ctx.bases.length === 0 ? 85 : 0),
    rationale: () => "A lodging base anchors the daily schedule",
    effect: "Adds first base to bases[]",
    actionType: "prompt",
  },
  {
    id: "add-must-do-activities",
    label: "Add must-do activities",
    facet: "activities",
    preconditions: (ctx) => ctx.skeleton.startDate !== null,
    isEligible: (ctx, focus) =>
      ctx.activities.length === 0 && (focus === null || focus === "itinerary" || focus === "activities"),
    score: (ctx) => (ctx.activities.length === 0 ? 80 : 0),
    rationale: () => "Activities define what you want to see and do",
    effect: "Adds activities to activities[]",
    actionType: "prompt",
  },
  {
    id: "generate-itinerary",
    label: "Build daily schedule",
    facet: "dailySchedules",
    preconditions: (ctx) =>
      ctx.bases.length > 0 && ctx.activities.length > 0,
    isEligible: (ctx, focus) =>
      ctx.dailySchedules.length === 0 && (focus === null || focus === "itinerary"),
    score: (ctx) => (ctx.dailySchedules.length === 0 ? 75 : 0),
    rationale: (ctx) =>
      `You have ${ctx.bases.length} base(s) and ${ctx.activities.length} activities — ready to schedule`,
    effect: "Generates dailySchedules from bases + activities",
    aiAssist: true,
    actionType: "compute",
  },
  {
    id: "compute-drive-totals",
    label: "Calculate drive times",
    facet: "driveLegs",
    preconditions: (ctx) => ctx.dailySchedules.length > 0,
    isEligible: (ctx, focus) =>
      ctx.driveLegs.length === 0 && (focus === null || focus === "driving"),
    score: (ctx) => (ctx.driveLegs.length === 0 ? 70 : 0),
    rationale: () => "Drive time estimates reveal if any day is overloaded",
    effect: "Computes driveLegs from dailySchedules",
    actionType: "compute",
  },
];
