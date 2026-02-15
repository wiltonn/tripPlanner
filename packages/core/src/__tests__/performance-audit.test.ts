import { describe, it, expect } from "vitest";
import {
  buildRouteSegmentFeatures,
  computeBBox,
} from "../geojson";
import type { MapboxDirectionsResponse } from "../geojson";

const MAX_SEGMENTS_PER_DAY = 5000;

function makeLargeResponse(stepCount: number): MapboxDirectionsResponse {
  const steps = Array.from({ length: stepCount }, (_, i) => ({
    geometry: {
      type: "LineString" as const,
      coordinates: [
        [-122.4 + i * 0.001, 37.7] as [number, number],
        [-122.4 + (i + 1) * 0.001, 37.7 + 0.001] as [number, number],
      ],
    },
    distance: 100,
    duration: 10,
  }));

  return {
    code: "Ok",
    routes: [
      {
        geometry: {
          type: "LineString",
          coordinates: [
            [-122.4, 37.7],
            [-122.3, 37.8],
          ],
        },
        distance: stepCount * 100,
        duration: stepCount * 10,
        legs: [{ steps, distance: stepCount * 100, duration: stepCount * 10 }],
      },
    ],
  };
}

describe("route-performance-audit", () => {
  it("realistic response stays well under 5000 segments", () => {
    const response = makeLargeResponse(50);
    const features = buildRouteSegmentFeatures(response, 0);
    expect(features.length).toBeLessThan(MAX_SEGMENTS_PER_DAY);
  });

  it("documents the 5000-segment boundary", () => {
    const response = makeLargeResponse(5001);
    const features = buildRouteSegmentFeatures(response, 0);
    expect(features.length).toBeGreaterThan(MAX_SEGMENTS_PER_DAY);
  });

  it("computeBBox produces finite values for non-empty inputs", () => {
    const response = makeLargeResponse(10);
    const features = buildRouteSegmentFeatures(response, 0);
    const bbox = computeBBox(features);
    for (const val of bbox) {
      expect(Number.isFinite(val)).toBe(true);
    }
  });

  it("computeBBox returns correct [minLon, minLat, maxLon, maxLat] ordering", () => {
    const response = makeLargeResponse(10);
    const features = buildRouteSegmentFeatures(response, 0);
    const bbox = computeBBox(features);
    expect(bbox[0]).toBeLessThanOrEqual(bbox[2]); // minLon <= maxLon
    expect(bbox[1]).toBeLessThanOrEqual(bbox[3]); // minLat <= maxLat
  });

  it("feature count equals step count when all steps are valid", () => {
    const count = 200;
    const response = makeLargeResponse(count);
    const features = buildRouteSegmentFeatures(response, 0);
    expect(features.length).toBe(count);
  });
});
