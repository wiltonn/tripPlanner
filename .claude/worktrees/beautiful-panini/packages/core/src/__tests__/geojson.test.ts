import { describe, it, expect } from "vitest";
import {
  buildPlaceFeature,
  buildRouteSegmentFeatures,
  computeBBox,
  PlaceFeatureSchema,
  RouteSegmentFeatureSchema,
} from "../geojson";
import type { Place } from "../types";
import type { MapboxDirectionsResponse } from "../geojson";

const now = new Date();
const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const uuid2 = "b1ffcd00-ad1c-5fa9-cc7e-7ccace491b22";

function makePlace(overrides: Partial<Place> = {}): Place {
  return {
    id: uuid,
    dayPlanId: uuid2,
    name: "Golden Gate Bridge",
    lat: 37.8199,
    lng: -122.4783,
    category: "landmark",
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeDirectionsResponse(
  overrides: Partial<MapboxDirectionsResponse> = {}
): MapboxDirectionsResponse {
  return {
    code: "Ok",
    routes: [
      {
        geometry: {
          type: "LineString",
          coordinates: [
            [-122.4194, 37.7749],
            [-122.4094, 37.7849],
            [-122.3994, 37.7949],
          ],
        },
        distance: 5000,
        duration: 600,
        legs: [
          {
            distance: 5000,
            duration: 600,
            steps: [
              {
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [-122.4194, 37.7749],
                    [-122.4094, 37.7849],
                  ],
                },
                distance: 2500,
                duration: 300,
              },
              {
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [-122.4094, 37.7849],
                    [-122.3994, 37.7949],
                  ],
                },
                distance: 2500,
                duration: 300,
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildPlaceFeature
// ---------------------------------------------------------------------------

describe("buildPlaceFeature", () => {
  it("builds a valid PlaceFeature from a Place", () => {
    const place = makePlace();
    const feature = buildPlaceFeature(place);

    expect(feature.type).toBe("Feature");
    expect(feature.geometry.type).toBe("Point");
    expect(feature.geometry.coordinates).toEqual([-122.4783, 37.8199]);
    expect(feature.properties.id).toBe(uuid);
    expect(feature.properties.name).toBe("Golden Gate Bridge");
    expect(feature.properties.category).toBe("landmark");
  });

  it("uses [lng, lat] ordering (not [lat, lng])", () => {
    const place = makePlace({ lat: 40.0, lng: -74.0 });
    const feature = buildPlaceFeature(place);
    expect(feature.geometry.coordinates).toEqual([-74.0, 40.0]);
  });

  it("includes dayIndex when provided", () => {
    const feature = buildPlaceFeature(makePlace(), 2);
    expect(feature.properties.dayIndex).toBe(2);
  });

  it("omits dayIndex when not provided", () => {
    const feature = buildPlaceFeature(makePlace());
    expect(feature.properties.dayIndex).toBeUndefined();
  });

  it("defaults category to 'other' when place has no category", () => {
    const feature = buildPlaceFeature(makePlace({ category: undefined }));
    expect(feature.properties.category).toBe("other");
  });

  it("passes PlaceFeatureSchema validation", () => {
    const feature = buildPlaceFeature(makePlace(), 0);
    const result = PlaceFeatureSchema.safeParse(feature);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildRouteSegmentFeatures
// ---------------------------------------------------------------------------

describe("buildRouteSegmentFeatures", () => {
  it("produces one feature per step", () => {
    const features = buildRouteSegmentFeatures(makeDirectionsResponse(), 0);
    expect(features).toHaveLength(2);
  });

  it("generates deterministic IDs", () => {
    const features = buildRouteSegmentFeatures(makeDirectionsResponse(), 0);
    expect(features[0].id).toBe("route:alt-0:0:0");
    expect(features[1].id).toBe("route:alt-0:0:1");
  });

  it("uses a custom routeId", () => {
    const features = buildRouteSegmentFeatures(
      makeDirectionsResponse(),
      0,
      "my-route"
    );
    expect(features[0].id).toContain("my-route");
    expect(features[0].properties.routeId).toBe("my-route");
  });

  it("sets correct properties on segments", () => {
    const features = buildRouteSegmentFeatures(makeDirectionsResponse(), 3);
    const first = features[0];
    expect(first.properties.dayIndex).toBe(3);
    expect(first.properties.legIndex).toBe(0);
    expect(first.properties.stepIndex).toBe(0);
    expect(first.properties.distance).toBe(2500);
    expect(first.properties.duration).toBe(300);
  });

  it("handles multiple alternatives", () => {
    const response = makeDirectionsResponse();
    response.routes.push({
      geometry: {
        type: "LineString",
        coordinates: [
          [-122.4194, 37.7749],
          [-122.3894, 37.8049],
        ],
      },
      distance: 6000,
      duration: 720,
      legs: [
        {
          distance: 6000,
          duration: 720,
          steps: [
            {
              geometry: {
                type: "LineString",
                coordinates: [
                  [-122.4194, 37.7749],
                  [-122.3894, 37.8049],
                ],
              },
              distance: 6000,
              duration: 720,
            },
          ],
        },
      ],
    });

    const features = buildRouteSegmentFeatures(response, 0);
    expect(features).toHaveLength(3);
    expect(features[2].properties.altId).toBe("alt-1");
  });

  it("skips steps with fewer than 2 coordinates", () => {
    const response = makeDirectionsResponse();
    response.routes[0].legs[0].steps.push({
      geometry: { type: "LineString", coordinates: [[-122.3, 37.8]] },
      distance: 0,
      duration: 0,
    });

    const features = buildRouteSegmentFeatures(response, 0);
    expect(features).toHaveLength(2); // degenerate step excluded
  });

  it("passes RouteSegmentFeatureSchema validation", () => {
    const features = buildRouteSegmentFeatures(makeDirectionsResponse(), 0);
    for (const feature of features) {
      const result = RouteSegmentFeatureSchema.safeParse(feature);
      expect(result.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// computeBBox
// ---------------------------------------------------------------------------

describe("computeBBox", () => {
  it("computes bbox from point features", () => {
    const features = [
      buildPlaceFeature(makePlace({ lng: -122.5, lat: 37.7 })),
      buildPlaceFeature(makePlace({ lng: -122.3, lat: 37.9 })),
    ];
    const bbox = computeBBox(features);
    expect(bbox).toEqual([-122.5, 37.7, -122.3, 37.9]);
  });

  it("computes bbox from line features", () => {
    const features = buildRouteSegmentFeatures(makeDirectionsResponse(), 0);
    const bbox = computeBBox(features);
    expect(bbox[0]).toBe(-122.4194); // minLon
    expect(bbox[1]).toBe(37.7749); // minLat
    expect(bbox[2]).toBe(-122.3994); // maxLon
    expect(bbox[3]).toBe(37.7949); // maxLat
  });

  it("computes bbox from mixed features", () => {
    const placeFeature = buildPlaceFeature(
      makePlace({ lng: -123.0, lat: 36.0 })
    );
    const segmentFeatures = buildRouteSegmentFeatures(
      makeDirectionsResponse(),
      0
    );
    const bbox = computeBBox([placeFeature, ...segmentFeatures]);
    expect(bbox[0]).toBe(-123.0); // place extends minLon
    expect(bbox[1]).toBe(36.0); // place extends minLat
    expect(bbox[2]).toBe(-122.3994); // segment maxLon
    expect(bbox[3]).toBe(37.7949); // segment maxLat
  });

  it("returns Infinity bbox for empty features", () => {
    const bbox = computeBBox([]);
    expect(bbox[0]).toBe(Infinity);
    expect(bbox[1]).toBe(Infinity);
    expect(bbox[2]).toBe(-Infinity);
    expect(bbox[3]).toBe(-Infinity);
  });
});
