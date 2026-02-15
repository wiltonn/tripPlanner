import { describe, it, expect } from "vitest";
import {
  normalizeIsochrone,
  type MapboxIsochroneResponse,
} from "../normalize";

function makeMockIsochroneResponse(): MapboxIsochroneResponse {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-122.43, 37.77],
              [-122.41, 37.79],
              [-122.39, 37.77],
              [-122.41, 37.75],
              [-122.43, 37.77],
            ],
          ],
        },
        properties: {
          contour: 15,
          color: "#6706ce",
          opacity: 0.33,
          metric: "time",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-122.45, 37.76],
              [-122.40, 37.80],
              [-122.37, 37.76],
              [-122.40, 37.72],
              [-122.45, 37.76],
            ],
          ],
        },
        properties: {
          contour: 30,
          color: "#04e813",
          opacity: 0.33,
          metric: "time",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-122.50, 37.74],
              [-122.38, 37.82],
              [-122.34, 37.74],
              [-122.38, 37.68],
              [-122.50, 37.74],
            ],
          ],
        },
        properties: {
          contour: 60,
          color: "#ff0000",
          opacity: 0.33,
          metric: "time",
        },
      },
    ],
  };
}

const CENTER: [number, number] = [-122.4194, 37.7749];

describe("normalizeIsochrone", () => {
  it("returns correct number of polygon features", () => {
    const result = normalizeIsochrone(makeMockIsochroneResponse(), CENTER);
    expect(result.polygons.features).toHaveLength(3);
  });

  it("generates deterministic IDs", () => {
    const result = normalizeIsochrone(makeMockIsochroneResponse(), CENTER);
    const ids = result.polygons.features.map((f) => f.id);
    expect(ids).toContain("iso:-122.41940,37.77490:15");
    expect(ids).toContain("iso:-122.41940,37.77490:30");
    expect(ids).toContain("iso:-122.41940,37.77490:60");
  });

  it("produces identical IDs on repeated calls", () => {
    const r1 = normalizeIsochrone(makeMockIsochroneResponse(), CENTER);
    const r2 = normalizeIsochrone(makeMockIsochroneResponse(), CENTER);
    const ids1 = r1.polygons.features.map((f) => f.id);
    const ids2 = r2.polygons.features.map((f) => f.id);
    expect(ids1).toEqual(ids2);
  });

  it("preserves minutes and color properties", () => {
    const result = normalizeIsochrone(makeMockIsochroneResponse(), CENTER);
    const first = result.polygons.features[0].properties;
    expect(first.minutes).toBe(15);
    expect(first.color).toBe("#6706ce");
    expect(first.metric).toBe("time");
  });

  it("computes bbox from all polygon geometries", () => {
    const result = normalizeIsochrone(makeMockIsochroneResponse(), CENTER);
    const [minLng, minLat, maxLng, maxLat] = result.bbox;
    expect(minLng).toBe(-122.50);
    expect(minLat).toBe(37.68);
    expect(maxLng).toBe(-122.34);
    expect(maxLat).toBe(37.82);
  });

  it("returns contours sorted by minutes ascending", () => {
    const result = normalizeIsochrone(makeMockIsochroneResponse(), CENTER);
    const minutes = result.contours.map((c) => c.minutes);
    expect(minutes).toEqual([15, 30, 60]);
  });

  it("returns center passthrough", () => {
    const result = normalizeIsochrone(makeMockIsochroneResponse(), CENTER);
    expect(result.center).toEqual(CENTER);
  });

  it("handles empty features array", () => {
    const empty: MapboxIsochroneResponse = {
      type: "FeatureCollection",
      features: [],
    };
    const result = normalizeIsochrone(empty, CENTER);
    expect(result.polygons.features).toHaveLength(0);
    expect(result.contours).toHaveLength(0);
  });

  it("skips features with non-Polygon geometry", () => {
    const bad: MapboxIsochroneResponse = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-122.4, 37.7] } as unknown as MapboxIsochroneResponse["features"][0]["geometry"],
          properties: {
            contour: 15,
            color: "#6706ce",
            opacity: 0.33,
            metric: "time",
          },
        },
      ],
    };
    const result = normalizeIsochrone(bad, CENTER);
    expect(result.polygons.features).toHaveLength(0);
  });
});
