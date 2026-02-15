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
      name: "Pacific Coast Trip",
      startDate: now,
      endDate: now,
      createdAt: now,
      updatedAt: now,
    });
    expect(result.name).toBe("Pacific Coast Trip");
    expect(result.startDate).toBeInstanceOf(Date);
  });

  it("rejects empty name", () => {
    expect(() =>
      TripSchema.parse({
        id: uuid,
        name: "",
        startDate: now,
        endDate: now,
        createdAt: now,
        updatedAt: now,
      })
    ).toThrow();
  });

  it("rejects invalid uuid", () => {
    expect(() =>
      TripSchema.parse({
        id: "not-a-uuid",
        name: "Trip",
        startDate: now,
        endDate: now,
        createdAt: now,
        updatedAt: now,
      })
    ).toThrow();
  });
});

describe("DayPlanSchema", () => {
  it("parses a valid day plan", () => {
    const result = DayPlanSchema.parse({
      id: uuid,
      tripId: uuid2,
      date: now,
      dayNumber: 1,
      createdAt: now,
      updatedAt: now,
    });
    expect(result.dayNumber).toBe(1);
  });

  it("rejects non-positive dayNumber", () => {
    expect(() =>
      DayPlanSchema.parse({
        id: uuid,
        tripId: uuid2,
        date: now,
        dayNumber: 0,
        createdAt: now,
        updatedAt: now,
      })
    ).toThrow();
  });
});

describe("PlaceSchema", () => {
  it("parses a valid place", () => {
    const result = PlaceSchema.parse({
      id: uuid,
      dayPlanId: uuid2,
      name: "Golden Gate Bridge",
      lat: 37.8199,
      lng: -122.4783,
      category: "landmark",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });
    expect(result.lat).toBe(37.8199);
    expect(result.lng).toBe(-122.4783);
  });

  it("rejects out-of-range latitude", () => {
    expect(() =>
      PlaceSchema.parse({
        id: uuid,
        dayPlanId: uuid2,
        name: "Invalid",
        lat: 91,
        lng: 0,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
    ).toThrow();
  });

  it("rejects out-of-range longitude", () => {
    expect(() =>
      PlaceSchema.parse({
        id: uuid,
        dayPlanId: uuid2,
        name: "Invalid",
        lat: 0,
        lng: 181,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
    ).toThrow();
  });
});

describe("RouteSchema", () => {
  it("parses a valid route", () => {
    const result = RouteSchema.parse({
      id: uuid,
      dayPlanId: uuid2,
      originPlaceId: uuid,
      destPlaceId: uuid2,
      createdAt: now,
      updatedAt: now,
    });
    expect(result.selectedAlternativeId).toBeUndefined();
  });
});

describe("RouteAlternativeSchema", () => {
  it("parses a valid alternative", () => {
    const result = RouteAlternativeSchema.parse({
      id: uuid,
      routeId: uuid2,
      distanceMeters: 15000,
      durationSeconds: 900,
      provider: "mapbox",
      createdAt: now,
      updatedAt: now,
    });
    expect(result.distanceMeters).toBe(15000);
  });

  it("rejects negative distance", () => {
    expect(() =>
      RouteAlternativeSchema.parse({
        id: uuid,
        routeId: uuid2,
        distanceMeters: -1,
        durationSeconds: 900,
        provider: "mapbox",
        createdAt: now,
        updatedAt: now,
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
