export interface GeoJSONLineString {
  type: "LineString";
  coordinates: [number, number][];
}

export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface GeoJSONFeature<G = GeoJSONLineString | GeoJSONPoint> {
  type: "Feature";
  id?: string;
  geometry: G;
  properties: Record<string, unknown>;
}

export type BBox = [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

export function createLineString(
  coordinates: [number, number][]
): GeoJSONLineString {
  return { type: "LineString", coordinates };
}

export function createPoint(lng: number, lat: number): GeoJSONPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

export function createFeature<G = GeoJSONLineString | GeoJSONPoint>(
  geometry: G,
  properties: Record<string, unknown> = {},
  id?: string
): GeoJSONFeature<G> {
  const feature: GeoJSONFeature<G> = { type: "Feature", geometry, properties };
  if (id !== undefined) feature.id = id;
  return feature;
}

export function createFeatureCollection(
  features: GeoJSONFeature[]
): GeoJSONFeatureCollection {
  return { type: "FeatureCollection", features };
}
