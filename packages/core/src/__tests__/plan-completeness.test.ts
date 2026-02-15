import { describe, it, expect } from "vitest";
import { computeCompleteness } from "../plan-completeness";
import { emptyPlanContext, tracked } from "../plan-context";
import type { PlanContext } from "../plan-context";

describe("computeCompleteness", () => {
  it("returns 0% for empty context", () => {
    const ctx = emptyPlanContext();
    const result = computeCompleteness(ctx);
    expect(result.overall).toBe(0);
    expect(result.openDecisions.length).toBeGreaterThan(0);
    expect(result.openDecisions).toContain("Set trip start date");
    expect(result.openDecisions).toContain("Set trip end date");
    expect(result.openDecisions).toContain("Name your trip");
  });

  it("skeleton completeness increases with filled fields", () => {
    const ctx = emptyPlanContext();
    ctx.skeleton.name = tracked("NYC Trip");
    ctx.skeleton.startDate = tracked("2026-03-14");

    const result = computeCompleteness(ctx);
    const skeleton = result.facets.find((f) => f.facet === "skeleton")!;
    expect(skeleton.filled).toBe(2);
    expect(skeleton.total).toBe(4);
    expect(skeleton.ratio).toBe(0.5);
  });

  it("returns higher score when skeleton is fully filled", () => {
    const ctx = emptyPlanContext();
    ctx.skeleton.name = tracked("NYC Trip");
    ctx.skeleton.startDate = tracked("2026-03-14");
    ctx.skeleton.endDate = tracked("2026-03-16");
    ctx.skeleton.partySize = tracked(2);

    const result = computeCompleteness(ctx);
    const skeleton = result.facets.find((f) => f.facet === "skeleton")!;
    expect(skeleton.ratio).toBe(1);
    expect(result.overall).toBeGreaterThan(0);
  });

  it("reports unassigned activities in open decisions", () => {
    const ctx = emptyPlanContext();
    ctx.skeleton.startDate = tracked("2026-03-14");
    ctx.skeleton.endDate = tracked("2026-03-16");
    ctx.activities = [
      {
        id: "act-1",
        name: tracked("Central Park"),
        location: tracked([-73.97, 40.78] as [number, number]),
        dayIndex: null,
        timeBlock: null,
        priority: tracked("must-do" as const),
        duration: tracked(120),
        cost: tracked(0),
      },
    ];

    const result = computeCompleteness(ctx);
    expect(result.openDecisions).toContain("Assign 1 activities to days");
  });

  it("approaches 1.0 for a fully-filled context", () => {
    const ctx = fullContext();
    const result = computeCompleteness(ctx);
    expect(result.overall).toBeGreaterThanOrEqual(0.8);
    expect(result.openDecisions.length).toBeLessThanOrEqual(2);
  });

  it("each facet has a ratio between 0 and 1", () => {
    const ctx = fullContext();
    const result = computeCompleteness(ctx);
    for (const f of result.facets) {
      expect(f.ratio).toBeGreaterThanOrEqual(0);
      expect(f.ratio).toBeLessThanOrEqual(1);
    }
  });
});

function fullContext(): PlanContext {
  return {
    skeleton: {
      name: tracked("NYC Trip"),
      startDate: tracked("2026-03-14"),
      endDate: tracked("2026-03-15"),
      arrivalAirport: tracked("JFK"),
      departureAirport: tracked("JFK"),
      partySize: tracked(2),
      partyDescription: tracked("Couple"),
    },
    bases: [
      {
        id: "base-1",
        name: tracked("Hotel"),
        location: tracked([-74.0, 40.74] as [number, number]),
        nights: tracked(2),
        checkIn: tracked("2026-03-14"),
        checkOut: tracked("2026-03-16"),
        booked: tracked(true),
        costPerNight: tracked(300),
      },
    ],
    activities: [
      {
        id: "act-1",
        name: tracked("Central Park"),
        location: tracked([-73.97, 40.78] as [number, number]),
        dayIndex: tracked(0),
        timeBlock: tracked("morning" as const),
        priority: tracked("must-do" as const),
        duration: tracked(120),
        cost: tracked(0),
      },
    ],
    dailySchedules: [
      {
        dayIndex: 0,
        baseId: "base-1",
        morning: ["act-1"],
        afternoon: [],
        evening: [],
      },
    ],
    driveLegs: [
      {
        id: "dl-1",
        fromId: "base-1",
        toId: "act-1",
        distance: tracked(5000),
        duration: tracked(600),
        departBy: null,
        routeGeojson: null,
      },
    ],
    budget: [
      {
        category: "Lodging",
        estimated: tracked(600),
        actual: tracked(600),
      },
    ],
    finalization: {
      emergencyContact: null,
      packingList: [],
      offlineNotes: [],
      confirmations: [],
    },
  };
}
