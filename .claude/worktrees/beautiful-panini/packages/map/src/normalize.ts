import {
  type GeoJSONFeature,
  type GeoJSONFeatureCollection,
  type GeoJSONLineString,
  type GeoJSONPolygon,
  type BBox,
  createFeature,
  createFeatureCollection,
  createLineString,
} from "./geojson";

// ---------------------------------------------------------------------------
// Mapbox Directions API response types (subset we care about)
// ---------------------------------------------------------------------------

export interface MapboxStep {
  geometry: { type: "LineString"; coordinates: [number, number][] };
  distance: number; // meters
  duration: number; // seconds
  name: string;
  maneuver: { type: string; instruction?: string };
}

export interface MapboxLeg {
  steps: MapboxStep[];
  distance: number;
  duration: number;
  summary: string;
}

export interface MapboxRoute {
  geometry: { type: "LineString"; coordinates: [number, number][] };
  legs: MapboxLeg[];
  distance: number;
  duration: number;
  weight: number;
  weight_name: string;
}

export interface MapboxDirectionsResponse {
  routes: MapboxRoute[];
  waypoints: { location: [number, number]; name: string }[];
  code: string;
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface SegmentProperties {
  id: string;
  dayIndex: number;
  altId: number;
  legIndex: number;
  stepIndex: number;
  distance: number;
  duration: number;
  name: string;
  cumulativeDistance: number;
  cumulativeDuration: number;
  altTotalDistance: number;
  altTotalDuration: number;
}

export interface LineProperties {
  id: string;
  dayIndex: number;
  altId: number;
  distance: number;
  duration: number;
}

export interface NormalizedSummary {
  totalDistance: number;
  totalDuration: number;
  legCount: number;
  stepCount: number;
}

export interface NormalizedDirections {
  lines: GeoJSONFeatureCollection;
  segments: GeoJSONFeatureCollection;
  bbox: BBox;
  summary: NormalizedSummary[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeBBox(coords: [number, number][]): BBox {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

function mergeBBox(a: BBox, b: BBox): BBox {
  return [
    Math.min(a[0], b[0]),
    Math.min(a[1], b[1]),
    Math.max(a[2], b[2]),
    Math.max(a[3], b[3]),
  ];
}

function stableId(
  routeId: string,
  altId: number,
  legIndex: number,
  stepIndex: number
): string {
  return `${routeId}:${altId}:${legIndex}:${stepIndex}`;
}

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------

export function normalizeDirections(
  response: MapboxDirectionsResponse,
  dayIndex: number,
  routeId: string = "route"
): NormalizedDirections {
  const lineFeatures: GeoJSONFeature<GeoJSONLineString>[] = [];
  const segmentFeatures: GeoJSONFeature<GeoJSONLineString>[] = [];
  const summaries: NormalizedSummary[] = [];
  let bbox: BBox = [Infinity, Infinity, -Infinity, -Infinity];

  for (let altId = 0; altId < response.routes.length; altId++) {
    const route = response.routes[altId];

    // Full route line feature
    const lineId = `${routeId}:${altId}`;
    const lineProps: LineProperties = {
      id: lineId,
      dayIndex,
      altId,
      distance: route.distance,
      duration: route.duration,
    };
    lineFeatures.push(
      createFeature(
        createLineString(route.geometry.coordinates),
        lineProps as unknown as Record<string, unknown>,
        lineId
      )
    );

    bbox = mergeBBox(bbox, computeBBox(route.geometry.coordinates));

    // Per-step segment features
    let stepCount = 0;
    let cumDist = 0;
    let cumDur = 0;
    for (let legIndex = 0; legIndex < route.legs.length; legIndex++) {
      const leg = route.legs[legIndex];
      for (let stepIndex = 0; stepIndex < leg.steps.length; stepIndex++) {
        const step = leg.steps[stepIndex];
        if (step.geometry.coordinates.length < 2) continue;

        cumDist += step.distance;
        cumDur += step.duration;

        const segId = stableId(routeId, altId, legIndex, stepIndex);
        const segProps: SegmentProperties = {
          id: segId,
          dayIndex,
          altId,
          legIndex,
          stepIndex,
          distance: step.distance,
          duration: step.duration,
          name: step.name,
          cumulativeDistance: cumDist,
          cumulativeDuration: cumDur,
          altTotalDistance: route.distance,
          altTotalDuration: route.duration,
        };
        segmentFeatures.push(
          createFeature(
            createLineString(step.geometry.coordinates),
            segProps as unknown as Record<string, unknown>,
            segId
          )
        );
        stepCount++;
      }
    }

    summaries.push({
      totalDistance: route.distance,
      totalDuration: route.duration,
      legCount: route.legs.length,
      stepCount,
    });
  }

  return {
    lines: createFeatureCollection(
      lineFeatures as unknown as GeoJSONFeature[]
    ),
    segments: createFeatureCollection(
      segmentFeatures as unknown as GeoJSONFeature[]
    ),
    bbox,
    summary: summaries,
  };
}

// ---------------------------------------------------------------------------
// Isochrone types
// ---------------------------------------------------------------------------

export interface MapboxIsochroneFeature {
  type: "Feature";
  geometry: { type: "Polygon"; coordinates: [number, number][][] };
  properties: {
    contour: number;
    color: string;
    opacity: number;
    metric: string;
    [key: string]: unknown;
  };
}

export interface MapboxIsochroneResponse {
  type: "FeatureCollection";
  features: MapboxIsochroneFeature[];
}

export interface IsochroneContourInfo {
  minutes: number;
  color: string;
}

export interface NormalizedIsochrone {
  polygons: GeoJSONFeatureCollection;
  center: [number, number];
  contours: IsochroneContourInfo[];
  bbox: BBox;
}

// ---------------------------------------------------------------------------
// Isochrone Normalizer
// ---------------------------------------------------------------------------

export function normalizeIsochrone(
  response: MapboxIsochroneResponse,
  center: [number, number]
): NormalizedIsochrone {
  const features: GeoJSONFeature<GeoJSONPolygon>[] = [];
  const contours: IsochroneContourInfo[] = [];
  let bbox: BBox = [Infinity, Infinity, -Infinity, -Infinity];

  const lon5 = center[0].toFixed(5);
  const lat5 = center[1].toFixed(5);

  for (const feat of response.features) {
    if (!feat.geometry || feat.geometry.type !== "Polygon") continue;

    const minutes = feat.properties.contour;
    const color = feat.properties.color;
    const id = `iso:${lon5},${lat5}:${minutes}`;

    const polygon: GeoJSONPolygon = {
      type: "Polygon",
      coordinates: feat.geometry.coordinates,
    };

    features.push(
      createFeature(
        polygon,
        {
          id,
          minutes,
          color,
          metric: feat.properties.metric ?? "time",
        },
        id
      ) as GeoJSONFeature<GeoJSONPolygon>
    );

    contours.push({ minutes, color });

    // Compute bbox from polygon exterior ring
    for (const ring of feat.geometry.coordinates) {
      for (const [lng, lat] of ring) {
        if (lng < bbox[0]) bbox[0] = lng;
        if (lat < bbox[1]) bbox[1] = lat;
        if (lng > bbox[2]) bbox[2] = lng;
        if (lat > bbox[3]) bbox[3] = lat;
      }
    }
  }

  return {
    polygons: createFeatureCollection(
      features as unknown as GeoJSONFeature[]
    ),
    center,
    contours: contours.sort((a, b) => a.minutes - b.minutes),
    bbox,
  };
}
