import { describe, it, expect } from "vitest";
import {
  IsochroneRequestSchema,
  IsochroneContourSchema,
  IsochroneResponseSchema,
} from "../schemas";

describe("IsochroneRequestSchema", () => {
  it("parses a valid request", () => {
    const result = IsochroneRequestSchema.parse({
      profile: "driving",
      coordinates: [-122.4194, 37.7749],
      contours_minutes: [15, 30, 60],
    });
    expect(result.profile).toBe("driving");
    expect(result.coordinates).toEqual([-122.4194, 37.7749]);
    expect(result.contours_minutes).toEqual([15, 30, 60]);
  });

  it("accepts all routing profiles", () => {
    for (const profile of ["driving", "walking", "cycling"]) {
      const result = IsochroneRequestSchema.parse({
        profile,
        coordinates: [-122.4194, 37.7749],
        contours_minutes: [15],
      });
      expect(result.profile).toBe(profile);
    }
  });

  it("rejects invalid profile", () => {
    expect(() =>
      IsochroneRequestSchema.parse({
        profile: "flying",
        coordinates: [-122.4194, 37.7749],
        contours_minutes: [15],
      })
    ).toThrow();
  });

  it("rejects contour minutes > 60", () => {
    expect(() =>
      IsochroneRequestSchema.parse({
        profile: "driving",
        coordinates: [-122.4194, 37.7749],
        contours_minutes: [90],
      })
    ).toThrow();
  });

  it("rejects contour minutes < 1", () => {
    expect(() =>
      IsochroneRequestSchema.parse({
        profile: "driving",
        coordinates: [-122.4194, 37.7749],
        contours_minutes: [0],
      })
    ).toThrow();
  });

  it("rejects empty contours_minutes array", () => {
    expect(() =>
      IsochroneRequestSchema.parse({
        profile: "driving",
        coordinates: [-122.4194, 37.7749],
        contours_minutes: [],
      })
    ).toThrow();
  });

  it("rejects more than 4 contour values", () => {
    expect(() =>
      IsochroneRequestSchema.parse({
        profile: "driving",
        coordinates: [-122.4194, 37.7749],
        contours_minutes: [5, 10, 15, 30, 60],
      })
    ).toThrow();
  });

  it("rejects missing coordinates", () => {
    expect(() =>
      IsochroneRequestSchema.parse({
        profile: "driving",
        contours_minutes: [15],
      })
    ).toThrow();
  });
});

describe("IsochroneContourSchema", () => {
  it("parses a valid contour", () => {
    const result = IsochroneContourSchema.parse({
      minutes: 15,
      color: "#6706ce",
    });
    expect(result.minutes).toBe(15);
    expect(result.color).toBe("#6706ce");
  });
});

describe("IsochroneResponseSchema", () => {
  it("parses a valid response", () => {
    const result = IsochroneResponseSchema.parse({
      contours: [
        { minutes: 15, color: "#6706ce" },
        { minutes: 30, color: "#04e813" },
      ],
      geojson: { type: "FeatureCollection", features: [] },
      center: [-122.4194, 37.7749],
    });
    expect(result.contours).toHaveLength(2);
    expect(result.center).toEqual([-122.4194, 37.7749]);
  });

  it("rejects missing center", () => {
    expect(() =>
      IsochroneResponseSchema.parse({
        contours: [],
        geojson: { type: "FeatureCollection", features: [] },
      })
    ).toThrow();
  });

  it("rejects missing contours", () => {
    expect(() =>
      IsochroneResponseSchema.parse({
        geojson: { type: "FeatureCollection", features: [] },
        center: [-122.4194, 37.7749],
      })
    ).toThrow();
  });
});
