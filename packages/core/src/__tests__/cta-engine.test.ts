import { describe, it, expect } from "vitest";
import { selectCTAs } from "../cta-engine";
import { emptyPlanContext, tracked } from "../plan-context";
import type { PlanContext } from "../plan-context";

describe("selectCTAs", () => {
  it("returns 'set-trip-dates' as top CTA for empty context", () => {
    const ctx = emptyPlanContext();
    const ctas = selectCTAs(ctx);

    expect(ctas.length).toBeGreaterThan(0);
    expect(ctas[0].id).toBe("set-trip-dates");
    expect(ctas[0].score).toBe(95);
  });

  it("does not return set-trip-dates once dates are set", () => {
    const ctx = emptyPlanContext();
    ctx.skeleton.startDate = tracked("2026-03-14");
    ctx.skeleton.endDate = tracked("2026-03-16");

    const ctas = selectCTAs(ctx);
    const datesCta = ctas.find((c) => c.id === "set-trip-dates");
    expect(datesCta).toBeUndefined();
  });

  it("returns 'add-first-base' when dates are set but no bases", () => {
    const ctx = emptyPlanContext();
    ctx.skeleton.startDate = tracked("2026-03-14");
    ctx.skeleton.endDate = tracked("2026-03-16");

    const ctas = selectCTAs(ctx);
    expect(ctas.some((c) => c.id === "add-first-base")).toBe(true);
  });

  it("returns 'add-must-do-activities' when dates set but no activities", () => {
    const ctx = emptyPlanContext();
    ctx.skeleton.startDate = tracked("2026-03-14");
    ctx.skeleton.endDate = tracked("2026-03-16");

    const ctas = selectCTAs(ctx);
    expect(ctas.some((c) => c.id === "add-must-do-activities")).toBe(true);
  });

  it("returns 'generate-itinerary' when bases + activities exist", () => {
    const ctx = contextWithBasesAndActivities();

    const ctas = selectCTAs(ctx);
    expect(ctas.some((c) => c.id === "generate-itinerary")).toBe(true);
  });

  it("respects maxCount parameter", () => {
    const ctx = emptyPlanContext();
    const ctas = selectCTAs(ctx, null, 1);
    expect(ctas.length).toBeLessThanOrEqual(1);
  });

  it("filters by overlay focus", () => {
    const ctx = contextWithBasesAndActivities();

    // Driving-focused: only driving-related CTAs
    const drivingCTAs = selectCTAs(ctx, "driving");
    for (const cta of drivingCTAs) {
      // Should not return CTAs ineligible for driving focus
      expect(["compute-drive-totals", "generate-itinerary"]).toContain(cta.id);
    }
  });

  it("returns CTAs sorted by score descending", () => {
    const ctx = emptyPlanContext();
    ctx.skeleton.startDate = tracked("2026-03-14");
    ctx.skeleton.endDate = tracked("2026-03-16");

    const ctas = selectCTAs(ctx, null, 10);
    for (let i = 1; i < ctas.length; i++) {
      expect(ctas[i - 1].score).toBeGreaterThanOrEqual(ctas[i].score);
    }
  });

  it("includes rationale string for each CTA", () => {
    const ctx = emptyPlanContext();
    const ctas = selectCTAs(ctx);
    for (const cta of ctas) {
      expect(typeof cta.rationale).toBe("string");
      expect(cta.rationale.length).toBeGreaterThan(0);
    }
  });

  it("returns empty array when all CTAs are satisfied", () => {
    const ctx = contextWithEverything();
    const ctas = selectCTAs(ctx);
    expect(ctas.length).toBe(0);
  });
});

function contextWithBasesAndActivities(): PlanContext {
  const ctx = emptyPlanContext();
  ctx.skeleton.startDate = tracked("2026-03-14");
  ctx.skeleton.endDate = tracked("2026-03-16");
  ctx.bases = [
    {
      id: "base-1",
      name: tracked("Hotel"),
      location: tracked([-74.0, 40.74] as [number, number]),
      nights: tracked(2),
      checkIn: null,
      checkOut: null,
      booked: tracked(false),
      costPerNight: null,
    },
  ];
  ctx.activities = [
    {
      id: "act-1",
      name: tracked("Museum"),
      location: tracked([-73.96, 40.78] as [number, number]),
      dayIndex: tracked(0),
      timeBlock: null,
      priority: tracked("must-do" as const),
      duration: null,
      cost: null,
    },
  ];
  return ctx;
}

function contextWithEverything(): PlanContext {
  const ctx = contextWithBasesAndActivities();
  ctx.dailySchedules = [
    {
      dayIndex: 0,
      baseId: "base-1",
      morning: ["act-1"],
      afternoon: [],
      evening: [],
    },
  ];
  ctx.driveLegs = [
    {
      id: "dl-1",
      fromId: "base-1",
      toId: "act-1",
      distance: tracked(5000),
      duration: tracked(600),
      departBy: null,
      routeGeojson: null,
    },
  ];
  return ctx;
}
