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
  geometry: G;
  properties: Record<string, unknown>;
}

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
  properties: Record<string, unknown> = {}
): GeoJSONFeature<G> {
  return { type: "Feature", geometry, properties };
}

export function createFeatureCollection(
  features: GeoJSONFeature[]
): GeoJSONFeatureCollection {
  return { type: "FeatureCollection", features };
}
