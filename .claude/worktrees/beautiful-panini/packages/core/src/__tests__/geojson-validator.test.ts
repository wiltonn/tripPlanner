import { describe, it, expect } from "vitest";
import {
  CoordinateSchema,
  BBoxSchema,
  PlaceFeatureSchema,
  PlaceFeatureCollectionSchema,
  RouteSegmentFeatureSchema,
  RouteSegmentFeatureCollectionSchema,
} from "../geojson";

// ---------------------------------------------------------------------------
// CoordinateSchema
// ---------------------------------------------------------------------------

describe("CoordinateSchema", () => {
  it("accepts valid [lon, lat]", () => {
    expect(CoordinateSchema.safeParse([-122.4194, 37.7749]).success).toBe(true);
  });

  it("accepts edge values [-180, -90]", () => {
    expect(CoordinateSchema.safeParse([-180, -90]).success).toBe(true);
  });

  it("accepts edge values [180, 90]", () => {
    expect(CoordinateSchema.safeParse([180, 90]).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BBoxSchema
// ---------------------------------------------------------------------------

describe("BBoxSchema", () => {
  it("accepts a valid 4-tuple", () => {
    const result = BBoxSchema.safeParse([-122.5, 37.7, -122.3, 37.9]);
    expect(result.success).toBe(true);
  });

  it("rejects a 3-tuple", () => {
    const result = BBoxSchema.safeParse([-122.5, 37.7, -122.3]);
    expect(result.success).toBe(false);
  });

  it("rejects a 5-tuple", () => {
    const result = BBoxSchema.safeParse([-122.5, 37.7, -122.3, 37.9, 0]);
    expect(result.success).toBe(false);
  });

  it("rejects non-number values", () => {
    const result = BBoxSchema.safeParse(["a", "b", "c", "d"]);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PlaceFeatureSchema — geometry type enforcement
// ---------------------------------------------------------------------------

describe("PlaceFeatureSchema", () => {
  const validPlace = {
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [-122.4194, 37.7749] },
    properties: { id: "place-1", name: "Test Place", category: "landmark" },
  };

  it("accepts a valid PlaceFeature", () => {
    expect(PlaceFeatureSchema.safeParse(validPlace).success).toBe(true);
  });

  it("accepts optional dayIndex", () => {
    const withDay = {
      ...validPlace,
      properties: { ...validPlace.properties, dayIndex: 0 },
    };
    expect(PlaceFeatureSchema.safeParse(withDay).success).toBe(true);
  });

  it("rejects missing type field", () => {
    const { type: _, ...noType } = validPlace;
    expect(PlaceFeatureSchema.safeParse(noType).success).toBe(false);
  });

  it("rejects LineString geometry (wrong geometry type)", () => {
    const lineGeom = {
      ...validPlace,
      geometry: {
        type: "LineString",
        coordinates: [
          [-122.4, 37.7],
          [-122.3, 37.8],
        ],
      },
    };
    expect(PlaceFeatureSchema.safeParse(lineGeom).success).toBe(false);
  });

  it("rejects null geometry", () => {
    const nullGeom = { ...validPlace, geometry: null };
    expect(PlaceFeatureSchema.safeParse(nullGeom).success).toBe(false);
  });

  it("rejects missing id property", () => {
    const { id: _, ...rest } = validPlace.properties;
    const noId = { ...validPlace, properties: rest };
    expect(PlaceFeatureSchema.safeParse(noId).success).toBe(false);
  });

  it("rejects missing name property", () => {
    const { name: _, ...rest } = validPlace.properties;
    const noName = { ...validPlace, properties: rest };
    expect(PlaceFeatureSchema.safeParse(noName).success).toBe(false);
  });

  it("rejects missing category property", () => {
    const { category: _, ...rest } = validPlace.properties;
    const noCat = { ...validPlace, properties: rest };
    expect(PlaceFeatureSchema.safeParse(noCat).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RouteSegmentFeatureSchema — geometry type enforcement
// ---------------------------------------------------------------------------

describe("RouteSegmentFeatureSchema", () => {
  const validSegment = {
    type: "Feature" as const,
    id: "route:alt-0:0:0",
    geometry: {
      type: "LineString" as const,
      coordinates: [
        [-122.4194, 37.7749],
        [-122.4094, 37.7849],
      ] as [number, number][],
    },
    properties: {
      routeId: "route",
      altId: "alt-0",
      dayIndex: 0,
      legIndex: 0,
      stepIndex: 0,
      duration: 300,
      distance: 2500,
    },
  };

  it("accepts a valid RouteSegmentFeature", () => {
    expect(RouteSegmentFeatureSchema.safeParse(validSegment).success).toBe(
      true
    );
  });

  it("rejects Point geometry (wrong geometry type)", () => {
    const pointGeom = {
      ...validSegment,
      geometry: { type: "Point", coordinates: [-122.4, 37.7] },
    };
    expect(RouteSegmentFeatureSchema.safeParse(pointGeom).success).toBe(false);
  });

  it("rejects LineString with fewer than 2 coordinates", () => {
    const singleCoord = {
      ...validSegment,
      geometry: {
        type: "LineString" as const,
        coordinates: [[-122.4, 37.7]],
      },
    };
    expect(RouteSegmentFeatureSchema.safeParse(singleCoord).success).toBe(
      false
    );
  });

  it("rejects missing routeId", () => {
    const { routeId: _, ...rest } = validSegment.properties;
    const noRouteId = { ...validSegment, properties: rest };
    expect(RouteSegmentFeatureSchema.safeParse(noRouteId).success).toBe(false);
  });

  it("rejects missing dayIndex", () => {
    const { dayIndex: _, ...rest } = validSegment.properties;
    const noDayIndex = { ...validSegment, properties: rest };
    expect(RouteSegmentFeatureSchema.safeParse(noDayIndex).success).toBe(false);
  });

  it("rejects missing distance", () => {
    const { distance: _, ...rest } = validSegment.properties;
    const noDist = { ...validSegment, properties: rest };
    expect(RouteSegmentFeatureSchema.safeParse(noDist).success).toBe(false);
  });

  it("rejects null geometry", () => {
    const nullGeom = { ...validSegment, geometry: null };
    expect(RouteSegmentFeatureSchema.safeParse(nullGeom).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FeatureCollection wrappers
// ---------------------------------------------------------------------------

describe("PlaceFeatureCollectionSchema", () => {
  it("accepts a valid collection", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-122.4, 37.7] },
          properties: { id: "p1", name: "A", category: "food" },
        },
      ],
    };
    expect(PlaceFeatureCollectionSchema.safeParse(fc).success).toBe(true);
  });

  it("rejects missing type on collection", () => {
    const fc = {
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-122.4, 37.7] },
          properties: { id: "p1", name: "A", category: "food" },
        },
      ],
    };
    expect(PlaceFeatureCollectionSchema.safeParse(fc).success).toBe(false);
  });
});

describe("RouteSegmentFeatureCollectionSchema", () => {
  it("accepts a valid collection with bbox", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "r:0:0:0",
          geometry: {
            type: "LineString",
            coordinates: [
              [-122.4, 37.7],
              [-122.3, 37.8],
            ],
          },
          properties: {
            routeId: "r",
            altId: "0",
            dayIndex: 0,
            legIndex: 0,
            stepIndex: 0,
            duration: 60,
            distance: 100,
          },
        },
      ],
      bbox: [-122.4, 37.7, -122.3, 37.8],
    };
    expect(RouteSegmentFeatureCollectionSchema.safeParse(fc).success).toBe(
      true
    );
  });

  it("accepts collection without bbox (optional)", () => {
    const fc = {
      type: "FeatureCollection",
      features: [],
    };
    expect(RouteSegmentFeatureCollectionSchema.safeParse(fc).success).toBe(
      true
    );
  });
});
