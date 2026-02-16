import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { DirectionsResponseSchema } from "@trip-planner/core";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../services/mapbox-client", () => ({
  fetchDirections: vi.fn().mockImplementation(async () => {
    const { makeMockMapboxResponse } = await import("./fixtures");
    return makeMockMapboxResponse();
  }),
  MapboxClientError: class MapboxClientError extends Error {
    statusCode: number;
    mapboxCode?: string;
    constructor(message: string, statusCode: number, mapboxCode?: string) {
      super(message);
      this.name = "MapboxClientError";
      this.statusCode = statusCode;
      this.mapboxCode = mapboxCode;
    }
  },
}));

vi.mock("../env", () => ({
  validateEnv: () => ({ MAPBOX_SECRET_TOKEN: "sk.test", API_PORT: 4000 }),
  getEnv: () => ({ MAPBOX_SECRET_TOKEN: "sk.test", API_PORT: 4000 }),
}));

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  const { directionsRoutes } = await import("../routes/directions");
  app.register(directionsRoutes);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

const validBody = {
  profile: "driving",
  coordinates: [
    [-122.4194, 37.7749],
    [-122.3994, 37.7949],
  ],
  alternatives: false,
};

// ---------------------------------------------------------------------------
// Response schema compliance
// ---------------------------------------------------------------------------

describe("routing-contract-check: response schema compliance", () => {
  it("returns 200 for valid request", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/directions",
      payload: validBody,
    });
    expect(res.statusCode).toBe(200);
  });

  it("response validates against DirectionsResponseSchema", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/directions",
      payload: validBody,
    });
    const body = res.json();
    const result = DirectionsResponseSchema.safeParse(body);
    expect(result.success).toBe(true);
  });

  it("response contains summary array", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/directions",
      payload: validBody,
    });
    const body = res.json();
    expect(Array.isArray(body.summary)).toBe(true);
    expect(body.summary.length).toBeGreaterThan(0);
  });

  it("response contains geojson with routeLines, segments, bbox", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/directions",
      payload: validBody,
    });
    const body = res.json();
    expect(body.geojson).toBeDefined();
    expect(body.geojson.routeLines).toBeDefined();
    expect(body.geojson.segments).toBeDefined();
    expect(body.geojson.bbox).toBeDefined();
    expect(body.geojson.bbox).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// No raw Mapbox leakage
// ---------------------------------------------------------------------------

describe("routing-contract-check: no raw Mapbox leakage", () => {
  it("response does NOT contain 'waypoints'", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/directions",
      payload: validBody,
    });
    const body = res.json();
    expect(body).not.toHaveProperty("waypoints");
  });

  it("response does NOT contain 'code'", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/directions",
      payload: validBody,
    });
    const body = res.json();
    expect(body).not.toHaveProperty("code");
  });

  it("response does NOT contain 'routes'", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/directions",
      payload: validBody,
    });
    const body = res.json();
    expect(body).not.toHaveProperty("routes");
  });

  it("response does NOT contain 'weight' or 'weight_name'", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/directions",
      payload: validBody,
    });
    const body = res.json();
    expect(body).not.toHaveProperty("weight");
    expect(body).not.toHaveProperty("weight_name");
  });
});

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

describe("routing-contract-check: request validation", () => {
  it("returns 400 for missing body", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/directions",
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for invalid profile", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/directions",
      payload: { ...validBody, profile: "flying" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for fewer than 2 coordinates", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/directions",
      payload: { ...validBody, coordinates: [[-122.4, 37.7]] },
    });
    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Deterministic feature IDs
// ---------------------------------------------------------------------------

describe("routing-contract-check: deterministic feature IDs", () => {
  it("all segment features have string IDs matching expected pattern", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/directions",
      payload: validBody,
    });
    const body = res.json();
    const segments = body.geojson.segments.features;
    for (const feature of segments) {
      expect(typeof feature.id).toBe("string");
      expect(feature.id).toMatch(/^.+:\d+:\d+:\d+$/);
    }
  });
});
