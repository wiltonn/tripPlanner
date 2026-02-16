import { describe, it, expect } from "vitest";
import {
  TripSchema,
  PlaceSchema,
  DirectionsRequestSchema,
  DirectionsResponseSchema,
  CoordinateSchema,
  BBoxSchema,
  PlaceFeatureSchema,
  RouteSegmentFeatureSchema,
  PlaceFeatureCollectionSchema,
  RouteSegmentFeatureCollectionSchema,
  buildPlaceFeature,
  buildRouteSegmentFeatures,
  computeBBox,
} from "../index";

const now = new Date().toISOString();
const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const uuid2 = "b1ffcd00-ad1c-5fa9-cc7e-7ccace491b22";

// ---------------------------------------------------------------------------
// Zod-TypeScript alignment: parse valid objects, verify returned keys
// ---------------------------------------------------------------------------

describe("ts-lsp-guard: Zod-TypeScript alignment", () => {
  it("TripSchema produces expected keys", () => {
    const trip = TripSchema.parse({
      id: uuid,
      organization_id: uuid2,
      name: "Test Trip",
      start_date: now,
      end_date: now,
      created_at: now,
      updated_at: now,
    });
    expect(trip).toHaveProperty("id");
    expect(trip).toHaveProperty("name");
    expect(trip).toHaveProperty("organization_id");
    expect(trip).toHaveProperty("start_date");
    expect(trip).toHaveProperty("end_date");
  });

  it("PlaceSchema produces expected keys", () => {
    const place = PlaceSchema.parse({
      id: uuid,
      organization_id: uuid2,
      day_plan_id: uuid2,
      name: "Test",
      lat: 37.7,
      lng: -122.4,
      sort_order: 0,
      created_at: now,
      updated_at: now,
    });
    expect(place).toHaveProperty("id");
    expect(place).toHaveProperty("lat");
    expect(place).toHaveProperty("lng");
    expect(place).toHaveProperty("name");
    expect(place).toHaveProperty("day_plan_id");
    expect(place).toHaveProperty("organization_id");
  });

  it("DirectionsRequestSchema produces expected keys", () => {
    const req = DirectionsRequestSchema.parse({
      profile: "driving",
      coordinates: [
        [-122.4, 37.7],
        [-118.2, 34.0],
      ],
      alternatives: true,
    });
    expect(req).toHaveProperty("profile");
    expect(req).toHaveProperty("coordinates");
    expect(req).toHaveProperty("alternatives");
  });

  it("DirectionsResponseSchema produces expected keys", () => {
    const res = DirectionsResponseSchema.parse({
      summary: [
        { totalDistance: 1000, totalDuration: 120, legCount: 1, stepCount: 5 },
      ],
      geojson: {
        routeLines: {},
        segments: {},
        bbox: [-122.5, 37.7, -122.3, 37.9],
      },
    });
    expect(res).toHaveProperty("summary");
    expect(res).toHaveProperty("geojson");
    expect(res.geojson).toHaveProperty("bbox");
    expect(res.geojson).toHaveProperty("routeLines");
    expect(res.geojson).toHaveProperty("segments");
  });
});

// ---------------------------------------------------------------------------
// Export completeness: all expected symbols are exported
// ---------------------------------------------------------------------------

describe("ts-lsp-guard: export completeness", () => {
  it("exports all domain schemas", () => {
    expect(TripSchema).toBeDefined();
    expect(PlaceSchema).toBeDefined();
    expect(DirectionsRequestSchema).toBeDefined();
    expect(DirectionsResponseSchema).toBeDefined();
  });

  it("exports all GeoJSON schemas", () => {
    expect(CoordinateSchema).toBeDefined();
    expect(BBoxSchema).toBeDefined();
    expect(PlaceFeatureSchema).toBeDefined();
    expect(RouteSegmentFeatureSchema).toBeDefined();
    expect(PlaceFeatureCollectionSchema).toBeDefined();
    expect(RouteSegmentFeatureCollectionSchema).toBeDefined();
  });

  it("exports all GeoJSON builders", () => {
    expect(typeof buildPlaceFeature).toBe("function");
    expect(typeof buildRouteSegmentFeatures).toBe("function");
    expect(typeof computeBBox).toBe("function");
  });
});
