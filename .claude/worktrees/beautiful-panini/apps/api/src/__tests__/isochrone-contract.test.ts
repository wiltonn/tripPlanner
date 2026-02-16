import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { IsochroneResponseSchema } from "@trip-planner/core";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../services/mapbox-client", () => ({
  fetchIsochrone: vi.fn().mockImplementation(async () => ({
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
  })),
  fetchDirections: vi.fn(),
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
  const { isochroneRoutes } = await import("../routes/isochrone");
  app.register(isochroneRoutes);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

const validBody = {
  profile: "driving",
  coordinates: [-122.4194, 37.7749],
  contours_minutes: [15, 30, 60],
};

// ---------------------------------------------------------------------------
// Response schema compliance
// ---------------------------------------------------------------------------

describe("isochrone-contract: response schema compliance", () => {
  it("returns 200 for valid request", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/isochrone",
      payload: validBody,
    });
    expect(res.statusCode).toBe(200);
  });

  it("response validates against IsochroneResponseSchema", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/isochrone",
      payload: validBody,
    });
    const body = res.json();
    const result = IsochroneResponseSchema.safeParse(body);
    expect(result.success).toBe(true);
  });

  it("response contains contours array", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/isochrone",
      payload: validBody,
    });
    const body = res.json();
    expect(Array.isArray(body.contours)).toBe(true);
    expect(body.contours.length).toBeGreaterThan(0);
  });

  it("response contains center coordinate", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/isochrone",
      payload: validBody,
    });
    const body = res.json();
    expect(body.center).toEqual([-122.4194, 37.7749]);
  });

  it("response geojson is a FeatureCollection", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/isochrone",
      payload: validBody,
    });
    const body = res.json();
    expect(body.geojson.type).toBe("FeatureCollection");
    expect(Array.isArray(body.geojson.features)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// No raw Mapbox leakage
// ---------------------------------------------------------------------------

describe("isochrone-contract: no raw Mapbox leakage", () => {
  it("response does NOT contain 'opacity' at top level", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/isochrone",
      payload: validBody,
    });
    const body = res.json();
    expect(body).not.toHaveProperty("opacity");
  });

  it("features have deterministic IDs", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/isochrone",
      payload: validBody,
    });
    const body = res.json();
    for (const feature of body.geojson.features) {
      expect(typeof feature.id).toBe("string");
      expect(feature.id).toMatch(/^iso:/);
    }
  });
});

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

describe("isochrone-contract: request validation", () => {
  it("returns 400 for missing body", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/isochrone",
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for invalid profile", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/isochrone",
      payload: { ...validBody, profile: "flying" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for contour minutes out of range", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/isochrone",
      payload: { ...validBody, contours_minutes: [90] },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for empty contours_minutes", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/routes/isochrone",
      payload: { ...validBody, contours_minutes: [] },
    });
    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Cache key determinism
// ---------------------------------------------------------------------------

describe("isochrone-contract: cache key determinism", () => {
  it("same request returns same response (cached)", async () => {
    const res1 = await app.inject({
      method: "POST",
      url: "/routes/isochrone",
      payload: validBody,
    });
    const res2 = await app.inject({
      method: "POST",
      url: "/routes/isochrone",
      payload: validBody,
    });
    expect(res1.json()).toEqual(res2.json());
  });
});
