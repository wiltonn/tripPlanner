import type { PlanContext } from "./plan-context";

// ---------------------------------------------------------------------------
// Per-facet completeness ratio
// ---------------------------------------------------------------------------

export interface FacetCompleteness {
  facet: string;
  filled: number;
  total: number;
  ratio: number;
}

export interface PlanCompleteness {
  facets: FacetCompleteness[];
  overall: number; // 0-1
  openDecisions: string[];
}

function ratio(filled: number, total: number): number {
  return total === 0 ? 0 : filled / total;
}

function skeletonCompleteness(ctx: PlanContext): FacetCompleteness {
  const s = ctx.skeleton;
  const fields = [s.name, s.startDate, s.endDate, s.partySize];
  const filled = fields.filter((f) => f !== null).length;
  return { facet: "skeleton", filled, total: fields.length, ratio: ratio(filled, fields.length) };
}

function basesCompleteness(ctx: PlanContext): FacetCompleteness {
  if (ctx.bases.length === 0) {
    return { facet: "bases", filled: 0, total: 1, ratio: 0 };
  }
  let filled = 0;
  let total = 0;
  for (const b of ctx.bases) {
    total += 3; // name, location, nights are core
    if (b.name) filled++;
    if (b.location) filled++;
    if (b.nights) filled++;
  }
  return { facet: "bases", filled, total, ratio: ratio(filled, total) };
}

function activitiesCompleteness(ctx: PlanContext): FacetCompleteness {
  if (ctx.activities.length === 0) {
    return { facet: "activities", filled: 0, total: 1, ratio: 0 };
  }
  let filled = 0;
  let total = 0;
  for (const a of ctx.activities) {
    total += 3; // name, dayIndex, priority are core
    if (a.name) filled++;
    if (a.dayIndex !== null) filled++;
    if (a.priority) filled++;
  }
  return { facet: "activities", filled, total, ratio: ratio(filled, total) };
}

function schedulesCompleteness(ctx: PlanContext): FacetCompleteness {
  if (ctx.dailySchedules.length === 0) {
    return { facet: "dailySchedules", filled: 0, total: 1, ratio: 0 };
  }
  let filled = 0;
  let total = 0;
  for (const ds of ctx.dailySchedules) {
    total += 3; // morning, afternoon, evening
    if (ds.morning.length > 0) filled++;
    if (ds.afternoon.length > 0) filled++;
    if (ds.evening.length > 0) filled++;
  }
  return { facet: "dailySchedules", filled, total, ratio: ratio(filled, total) };
}

function driveLegsCompleteness(ctx: PlanContext): FacetCompleteness {
  if (ctx.driveLegs.length === 0) {
    return { facet: "driveLegs", filled: 0, total: 1, ratio: 0 };
  }
  let filled = 0;
  let total = 0;
  for (const dl of ctx.driveLegs) {
    total += 2; // distance, duration
    if (dl.distance !== null) filled++;
    if (dl.duration !== null) filled++;
  }
  return { facet: "driveLegs", filled, total, ratio: ratio(filled, total) };
}

function budgetCompleteness(ctx: PlanContext): FacetCompleteness {
  if (ctx.budget.length === 0) {
    return { facet: "budget", filled: 0, total: 1, ratio: 0 };
  }
  let filled = 0;
  const total = ctx.budget.length;
  for (const bc of ctx.budget) {
    if (bc.estimated !== null) filled++;
  }
  return { facet: "budget", filled, total, ratio: ratio(filled, total) };
}

// ---------------------------------------------------------------------------
// Open decisions
// ---------------------------------------------------------------------------

function collectOpenDecisions(ctx: PlanContext): string[] {
  const decisions: string[] = [];
  const s = ctx.skeleton;

  if (!s.startDate) decisions.push("Set trip start date");
  if (!s.endDate) decisions.push("Set trip end date");
  if (!s.name) decisions.push("Name your trip");
  if (!s.partySize) decisions.push("Set party size");
  if (ctx.bases.length === 0) decisions.push("Add at least one lodging base");
  if (ctx.activities.length === 0) decisions.push("Add activities");

  const unassigned = ctx.activities.filter((a) => a.dayIndex === null);
  if (unassigned.length > 0) {
    decisions.push(`Assign ${unassigned.length} activities to days`);
  }

  if (ctx.dailySchedules.length === 0 && ctx.activities.length > 0) {
    decisions.push("Build daily schedule");
  }

  if (ctx.driveLegs.length === 0 && ctx.dailySchedules.length > 0) {
    decisions.push("Compute drive legs");
  }

  if (ctx.budget.length === 0 && (ctx.bases.length > 0 || ctx.activities.length > 0)) {
    decisions.push("Set up budget");
  }

  return decisions;
}

// ---------------------------------------------------------------------------
// Main scorer
// ---------------------------------------------------------------------------

const FACET_WEIGHTS: Record<string, number> = {
  skeleton: 0.20,
  bases: 0.20,
  activities: 0.20,
  dailySchedules: 0.15,
  driveLegs: 0.10,
  budget: 0.10,
  finalization: 0.05,
};

export function computeCompleteness(ctx: PlanContext): PlanCompleteness {
  const facets: FacetCompleteness[] = [
    skeletonCompleteness(ctx),
    basesCompleteness(ctx),
    activitiesCompleteness(ctx),
    schedulesCompleteness(ctx),
    driveLegsCompleteness(ctx),
    budgetCompleteness(ctx),
  ];

  let overall = 0;
  for (const f of facets) {
    const weight = FACET_WEIGHTS[f.facet] ?? 0;
    overall += f.ratio * weight;
  }

  // Normalize to account for finalization weight not being tracked in facets
  const trackedWeight = facets.reduce((sum, f) => sum + (FACET_WEIGHTS[f.facet] ?? 0), 0);
  if (trackedWeight > 0) {
    overall = overall / trackedWeight;
  }

  return {
    facets,
    overall: Math.round(overall * 100) / 100,
    openDecisions: collectOpenDecisions(ctx),
  };
}
