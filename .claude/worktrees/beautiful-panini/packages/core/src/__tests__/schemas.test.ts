import { describe, it, expect } from "vitest";
import {
  TripSchema,
  DayPlanSchema,
  PlaceSchema,
  RouteSchema,
  RouteAlternativeSchema,
  DirectionsRequestSchema,
} from "../schemas";

const now = new Date().toISOString();
const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const uuid2 = "b1ffcd00-ad1c-5fa9-cc7e-7ccace491b22";

describe("TripSchema", () => {
  it("parses a valid trip", () => {
    const result = TripSchema.parse({
      id: uuid,
      organization_id: uuid2,
      name: "Pacific Coast Trip",
      start_date: now,
      end_date: now,
      created_at: now,
      updated_at: now,
    });
    expect(result.name).toBe("Pacific Coast Trip");
    expect(result.start_date).toBe(now);
  });

  it("rejects empty name", () => {
    expect(() =>
      TripSchema.parse({
        id: uuid,
        organization_id: uuid2,
        name: "",
        start_date: now,
        end_date: now,
        created_at: now,
        updated_at: now,
      })
    ).toThrow();
  });

  it("rejects invalid uuid", () => {
    expect(() =>
      TripSchema.parse({
        id: "not-a-uuid",
        organization_id: uuid2,
        name: "Trip",
        start_date: now,
        end_date: now,
        created_at: now,
        updated_at: now,
      })
    ).toThrow();
  });
});

describe("DayPlanSchema", () => {
  it("parses a valid day plan", () => {
    const result = DayPlanSchema.parse({
      id: uuid,
      organization_id: uuid2,
      trip_id: uuid2,
      date: now,
      day_number: 1,
      created_at: now,
      updated_at: now,
    });
    expect(result.day_number).toBe(1);
  });

  it("rejects non-positive dayNumber", () => {
    expect(() =>
      DayPlanSchema.parse({
        id: uuid,
        organization_id: uuid2,
        trip_id: uuid2,
        date: now,
        day_number: 0,
        created_at: now,
        updated_at: now,
      })
    ).toThrow();
  });
});

describe("PlaceSchema", () => {
  it("parses a valid place", () => {
    const result = PlaceSchema.parse({
      id: uuid,
      organization_id: uuid2,
      day_plan_id: uuid2,
      name: "Golden Gate Bridge",
      lat: 37.8199,
      lng: -122.4783,
      category: "landmark",
      sort_order: 0,
      created_at: now,
      updated_at: now,
    });
    expect(result.lat).toBe(37.8199);
    expect(result.lng).toBe(-122.4783);
  });

  it("rejects out-of-range latitude", () => {
    expect(() =>
      PlaceSchema.parse({
        id: uuid,
        organization_id: uuid2,
        day_plan_id: uuid2,
        name: "Invalid",
        lat: 91,
        lng: 0,
        sort_order: 0,
        created_at: now,
        updated_at: now,
      })
    ).toThrow();
  });

  it("rejects out-of-range longitude", () => {
    expect(() =>
      PlaceSchema.parse({
        id: uuid,
        organization_id: uuid2,
        day_plan_id: uuid2,
        name: "Invalid",
        lat: 0,
        lng: 181,
        sort_order: 0,
        created_at: now,
        updated_at: now,
      })
    ).toThrow();
  });
});

describe("RouteSchema", () => {
  it("parses a valid route", () => {
    const result = RouteSchema.parse({
      id: uuid,
      organization_id: uuid2,
      day_plan_id: uuid2,
      origin_place_id: uuid,
      dest_place_id: uuid2,
      created_at: now,
      updated_at: now,
    });
    expect(result.selected_alternative_id).toBeUndefined();
  });
});

describe("RouteAlternativeSchema", () => {
  it("parses a valid alternative", () => {
    const result = RouteAlternativeSchema.parse({
      id: uuid,
      organization_id: uuid2,
      route_id: uuid2,
      distance_meters: 15000,
      duration_seconds: 900,
      provider: "mapbox",
      created_at: now,
      updated_at: now,
    });
    expect(result.distance_meters).toBe(15000);
  });

  it("rejects negative distance", () => {
    expect(() =>
      RouteAlternativeSchema.parse({
        id: uuid,
        organization_id: uuid2,
        route_id: uuid2,
        distance_meters: -1,
        duration_seconds: 900,
        provider: "mapbox",
        created_at: now,
        updated_at: now,
      })
    ).toThrow();
  });
});

describe("DirectionsRequestSchema", () => {
  it("parses a valid request", () => {
    const result = DirectionsRequestSchema.parse({
      profile: "driving",
      coordinates: [
        [-122.4194, 37.7749],
        [-118.2437, 34.0522],
      ],
      alternatives: true,
    });
    expect(result.profile).toBe("driving");
    expect(result.coordinates).toHaveLength(2);
  });

  it("accepts avoid options", () => {
    const result = DirectionsRequestSchema.parse({
      profile: "driving",
      coordinates: [
        [-122.4194, 37.7749],
        [-118.2437, 34.0522],
      ],
      alternatives: false,
      avoid: { tolls: true, highways: true },
    });
    expect(result.avoid?.tolls).toBe(true);
  });

  it("rejects invalid profile", () => {
    expect(() =>
      DirectionsRequestSchema.parse({
        profile: "flying",
        coordinates: [
          [-122.4194, 37.7749],
          [-118.2437, 34.0522],
        ],
        alternatives: false,
      })
    ).toThrow();
  });

  it("rejects fewer than 2 coordinates", () => {
    expect(() =>
      DirectionsRequestSchema.parse({
        profile: "driving",
        coordinates: [[-122.4194, 37.7749]],
        alternatives: false,
      })
    ).toThrow();
  });
});
