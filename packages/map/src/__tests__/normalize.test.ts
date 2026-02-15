import { describe, it, expect } from "vitest";
import { normalizeDirections } from "../normalize";
import { makeMockMapboxResponse, makeTwoAlternativeResponse } from "./fixtures";

// ---------------------------------------------------------------------------
// Per-step segments
// ---------------------------------------------------------------------------

describe("normalizeDirections: per-step segments", () => {
  it("produces one segment feature per valid step", () => {
    const result = normalizeDirections(makeMockMapboxResponse(), 0);
    expect(result.segments.features).toHaveLength(2);
  });

  it("skips degenerate steps with < 2 coordinates", () => {
    const response = makeMockMapboxResponse();
    response.routes[0].legs[0].steps.push({
      geometry: { type: "LineString", coordinates: [[-122.3, 37.8]] },
      distance: 0,
      duration: 0,
      name: "dead-end",
      maneuver: { type: "arrive" },
    });
    const result = normalizeDirections(response, 0);
    expect(result.segments.features).toHaveLength(2);
  });

  it("produces one line feature per alternative", () => {
    const result = normalizeDirections(makeTwoAlternativeResponse(), 0);
    expect(result.lines.features).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Coordinate preservation
// ---------------------------------------------------------------------------

describe("normalizeDirections: coordinate preservation", () => {
  it("segment coordinates match input step coordinates exactly", () => {
    const response = makeMockMapboxResponse();
    const result = normalizeDirections(response, 0);
    const firstSegment = result.segments.features[0];
    expect(firstSegment.geometry.coordinates).toEqual([
      [-122.4194, 37.7749],
      [-122.4094, 37.7849],
    ]);
  });

  it("line coordinates match route geometry", () => {
    const response = makeMockMapboxResponse();
    const result = normalizeDirections(response, 0);
    const line = result.lines.features[0];
    expect(line.geometry.coordinates).toEqual(
      response.routes[0].geometry.coordinates
    );
  });
});

// ---------------------------------------------------------------------------
// Cumulative metrics (summary)
// ---------------------------------------------------------------------------

describe("normalizeDirections: cumulative metrics", () => {
  it("summary totalDistance matches route distance", () => {
    const result = normalizeDirections(makeMockMapboxResponse(), 0);
    expect(result.summary[0].totalDistance).toBe(5000);
  });

  it("summary totalDuration matches route duration", () => {
    const result = normalizeDirections(makeMockMapboxResponse(), 0);
    expect(result.summary[0].totalDuration).toBe(600);
  });

  it("legCount is accurate", () => {
    const result = normalizeDirections(makeMockMapboxResponse(), 0);
    expect(result.summary[0].legCount).toBe(1);
  });

  it("stepCount is accurate", () => {
    const result = normalizeDirections(makeMockMapboxResponse(), 0);
    expect(result.summary[0].stepCount).toBe(2);
  });

  it("produces one summary per alternative", () => {
    const result = normalizeDirections(makeTwoAlternativeResponse(), 0);
    expect(result.summary).toHaveLength(2);
    expect(result.summary[1].totalDistance).toBe(6000);
  });
});

// ---------------------------------------------------------------------------
// Cumulative segment properties
// ---------------------------------------------------------------------------

describe("normalizeDirections: cumulative segment properties", () => {
  it("first segment cumulativeDuration equals its own duration", () => {
    const result = normalizeDirections(makeMockMapboxResponse(), 0);
    const props = result.segments.features[0].properties;
    expect(props.cumulativeDuration).toBe(300);
  });

  it("second segment cumulativeDuration equals sum of both", () => {
    const result = normalizeDirections(makeMockMapboxResponse(), 0);
    const props = result.segments.features[1].properties;
    expect(props.cumulativeDuration).toBe(600);
  });

  it("last segment cumulativeDistance equals altTotalDistance", () => {
    const result = normalizeDirections(makeMockMapboxResponse(), 0);
    const last = result.segments.features[result.segments.features.length - 1].properties;
    expect(last.cumulativeDistance).toBe(last.altTotalDistance);
  });

  it("cumulative resets per alternative", () => {
    const result = normalizeDirections(makeTwoAlternativeResponse(), 0);
    // Alt 1 has one step with distance 6000
    const alt1Segments = result.segments.features.filter(
      (f) => f.properties.altId === 1
    );
    expect(alt1Segments[0].properties.cumulativeDistance).toBe(6000);
    expect(alt1Segments[0].properties.cumulativeDuration).toBe(720);
  });

  it("altTotalDuration matches route total per alternative", () => {
    const result = normalizeDirections(makeTwoAlternativeResponse(), 0);
    const alt0 = result.segments.features.find((f) => f.properties.altId === 0);
    const alt1 = result.segments.features.find((f) => f.properties.altId === 1);
    expect(alt0!.properties.altTotalDuration).toBe(600);
    expect(alt1!.properties.altTotalDuration).toBe(720);
  });
});

// ---------------------------------------------------------------------------
// BBox
// ---------------------------------------------------------------------------

describe("normalizeDirections: bbox", () => {
  it("bbox encloses all route coordinates", () => {
    const result = normalizeDirections(makeMockMapboxResponse(), 0);
    const [minLon, minLat, maxLon, maxLat] = result.bbox;
    expect(minLon).toBeLessThanOrEqual(-122.4194);
    expect(minLat).toBeLessThanOrEqual(37.7749);
    expect(maxLon).toBeGreaterThanOrEqual(-122.3994);
    expect(maxLat).toBeGreaterThanOrEqual(37.7949);
  });

  it("bbox has correct [minLon, minLat, maxLon, maxLat] ordering", () => {
    const result = normalizeDirections(makeMockMapboxResponse(), 0);
    expect(result.bbox[0]).toBeLessThanOrEqual(result.bbox[2]);
    expect(result.bbox[1]).toBeLessThanOrEqual(result.bbox[3]);
  });
});

// ---------------------------------------------------------------------------
// Deterministic IDs
// ---------------------------------------------------------------------------

describe("normalizeDirections: deterministic IDs", () => {
  it("segment IDs match routeId:altId:legIndex:stepIndex pattern", () => {
    const result = normalizeDirections(makeMockMapboxResponse(), 0, "myroute");
    const ids = result.segments.features.map((f) => f.id);
    expect(ids[0]).toBe("myroute:0:0:0");
    expect(ids[1]).toBe("myroute:0:0:1");
  });

  it("line IDs match routeId:altId pattern", () => {
    const result = normalizeDirections(makeMockMapboxResponse(), 0, "myroute");
    expect(result.lines.features[0].id).toBe("myroute:0");
  });

  it("same input produces same output (determinism)", () => {
    const response = makeMockMapboxResponse();
    const a = normalizeDirections(response, 0);
    const b = normalizeDirections(response, 0);
    expect(a.segments.features.map((f) => f.id)).toEqual(
      b.segments.features.map((f) => f.id)
    );
    expect(a.lines.features.map((f) => f.id)).toEqual(
      b.lines.features.map((f) => f.id)
    );
  });

  it("all IDs are unique across alternatives", () => {
    const result = normalizeDirections(makeTwoAlternativeResponse(), 0);
    const allIds = [
      ...result.segments.features.map((f) => f.id),
      ...result.lines.features.map((f) => f.id),
    ];
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });
});
