import { z } from "zod";
import type { Place } from "./types";

// ---------------------------------------------------------------------------
// Coordinate & Geometry Primitives
// ---------------------------------------------------------------------------

export const CoordinateSchema = z.tuple([z.number(), z.number()]); // [lon, lat]

export const PointGeometrySchema = z.object({
  type: z.literal("Point"),
  coordinates: CoordinateSchema,
});

export const LineStringGeometrySchema = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(CoordinateSchema).min(2),
});

export const BBoxSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]); // [minLon, minLat, maxLon, maxLat]

export type BBox = z.infer<typeof BBoxSchema>;

// ---------------------------------------------------------------------------
// PlaceFeature (Point)
// ---------------------------------------------------------------------------

export const PlaceFeaturePropertiesSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  dayIndex: z.number().int().nonnegative().optional(),
});

export const PlaceFeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: PointGeometrySchema,
  properties: PlaceFeaturePropertiesSchema,
});

export type PlaceFeature = z.infer<typeof PlaceFeatureSchema>;

// ---------------------------------------------------------------------------
// RouteSegmentFeature (LineString)
// ---------------------------------------------------------------------------

export const RouteSegmentPropertiesSchema = z.object({
  routeId: z.string(),
  altId: z.string(),
  dayIndex: z.number().int().nonnegative(),
  legIndex: z.number().int().nonnegative(),
  stepIndex: z.number().int().nonnegative(),
  duration: z.number().nonnegative(),
  distance: z.number().nonnegative(),
});

export const RouteSegmentFeatureSchema = z.object({
  type: z.literal("Feature"),
  id: z.string(),
  geometry: LineStringGeometrySchema,
  properties: RouteSegmentPropertiesSchema,
});

export type RouteSegmentFeature = z.infer<typeof RouteSegmentFeatureSchema>;

// ---------------------------------------------------------------------------
// FeatureCollection Wrappers
// ---------------------------------------------------------------------------

export const PlaceFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(PlaceFeatureSchema),
});

export const RouteSegmentFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(RouteSegmentFeatureSchema),
  bbox: BBoxSchema.optional(),
});

export type PlaceFeatureCollection = z.infer<typeof PlaceFeatureCollectionSchema>;
export type RouteSegmentFeatureCollection = z.infer<typeof RouteSegmentFeatureCollectionSchema>;

// We alias this for the route alternative use-case: one FeatureCollection per alternative
export type RouteAlternativeFeatureCollection = RouteSegmentFeatureCollection;

// ---------------------------------------------------------------------------
// Mapbox Directions Response Shape (for normalization input)
// ---------------------------------------------------------------------------

export interface MapboxStep {
  geometry: { type: "LineString"; coordinates: [number, number][] };
  distance: number;
  duration: number;
}

export interface MapboxLeg {
  steps: MapboxStep[];
  distance: number;
  duration: number;
}

export interface MapboxRoute {
  geometry: { type: "LineString"; coordinates: [number, number][] };
  legs: MapboxLeg[];
  distance: number;
  duration: number;
}

export interface MapboxDirectionsResponse {
  routes: MapboxRoute[];
  code: string;
}

// ---------------------------------------------------------------------------
// Builder: buildPlaceFeature
// ---------------------------------------------------------------------------

export function buildPlaceFeature(
  place: Place,
  dayIndex?: number
): PlaceFeature {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [place.lng, place.lat],
    },
    properties: {
      id: place.id,
      name: place.name,
      category: place.category ?? "other",
      ...(dayIndex !== undefined ? { dayIndex } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Builder: buildRouteSegmentFeatures
// ---------------------------------------------------------------------------

function segmentId(
  routeId: string,
  altId: string,
  legIndex: number,
  stepIndex: number
): string {
  return `${routeId}:${altId}:${legIndex}:${stepIndex}`;
}

export function buildRouteSegmentFeatures(
  response: MapboxDirectionsResponse,
  dayIndex: number,
  routeId: string = "route"
): RouteSegmentFeature[] {
  const features: RouteSegmentFeature[] = [];

  for (let altIdx = 0; altIdx < response.routes.length; altIdx++) {
    const route = response.routes[altIdx];
    const altId = `alt-${altIdx}`;

    for (let legIdx = 0; legIdx < route.legs.length; legIdx++) {
      const leg = route.legs[legIdx];

      for (let stepIdx = 0; stepIdx < leg.steps.length; stepIdx++) {
        const step = leg.steps[stepIdx];
        if (step.geometry.coordinates.length < 2) continue;

        const id = segmentId(routeId, altId, legIdx, stepIdx);
        features.push({
          type: "Feature",
          id,
          geometry: {
            type: "LineString",
            coordinates: step.geometry.coordinates,
          },
          properties: {
            routeId,
            altId,
            dayIndex,
            legIndex: legIdx,
            stepIndex: stepIdx,
            duration: step.duration,
            distance: step.distance,
          },
        });
      }
    }
  }

  return features;
}

// ---------------------------------------------------------------------------
// Builder: computeBBox
// ---------------------------------------------------------------------------

export function computeBBox(
  features: Array<PlaceFeature | RouteSegmentFeature>
): BBox {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const feature of features) {
    const geom = feature.geometry;

    if (geom.type === "Point") {
      const [lon, lat] = geom.coordinates;
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
    } else if (geom.type === "LineString") {
      for (const [lon, lat] of geom.coordinates) {
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  return [minLon, minLat, maxLon, maxLat];
}
