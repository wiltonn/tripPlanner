import type { DirectionsRequest, IsochroneRequest } from "@trip-planner/core";
import type { MapboxDirectionsResponse } from "@trip-planner/map";

class MapboxError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public mapboxCode?: string
  ) {
    super(message);
    this.name = "MapboxError";
  }
}

function getToken(): string {
  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) throw new Error("MAPBOX_SECRET_TOKEN is not set");
  return token;
}

export async function fetchDirections(
  req: DirectionsRequest
): Promise<MapboxDirectionsResponse> {
  const token = getToken();

  const coords = req.coordinates
    .map(([lon, lat]) => `${lon},${lat}`)
    .join(";");

  const params = new URLSearchParams({
    geometries: "geojson",
    steps: "true",
    overview: "full",
    alternatives: String(req.alternatives),
    access_token: token,
  });

  if (req.avoid) {
    const excludes: string[] = [];
    if (req.avoid.tolls) excludes.push("toll");
    if (req.avoid.ferries) excludes.push("ferry");
    if (req.avoid.highways) excludes.push("motorway");
    if (excludes.length > 0) {
      params.set("exclude", excludes.join(","));
    }
  }

  const url = `https://api.mapbox.com/directions/v5/mapbox/${req.profile}/${coords}?${params}`;

  const response = await fetch(url);
  const body = await response.json();

  if (!response.ok) {
    throw new MapboxError(
      body.message ?? "Mapbox API error",
      response.status,
      body.code
    );
  }

  if (body.code !== "Ok") {
    throw new MapboxError(
      body.message ?? `Mapbox returned code: ${body.code}`,
      422,
      body.code
    );
  }

  if (!body.routes || body.routes.length === 0) {
    throw new MapboxError("No route found", 422, "NoRoute");
  }

  return body as MapboxDirectionsResponse;
}

export interface MapboxIsochroneResponse {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Polygon"; coordinates: [number, number][][] };
    properties: {
      contour: number;
      color: string;
      opacity: number;
      metric: string;
      [key: string]: unknown;
    };
  }>;
}

export async function fetchIsochrone(
  req: IsochroneRequest
): Promise<MapboxIsochroneResponse> {
  const token = getToken();

  const [lon, lat] = req.coordinates;

  const params = new URLSearchParams({
    contours_minutes: req.contours_minutes.join(","),
    polygons: "true",
    denoise: "0.3",
    generalize: "10",
    access_token: token,
  });

  const url = `https://api.mapbox.com/isochrone/v1/mapbox/${req.profile}/${lon},${lat}?${params}`;

  const response = await fetch(url);
  const body = await response.json();

  if (!response.ok) {
    throw new MapboxError(
      body.message ?? "Mapbox Isochrone API error",
      response.status,
      body.code
    );
  }

  if (!body.features || !Array.isArray(body.features)) {
    throw new MapboxError(
      "Invalid isochrone response: missing features",
      422,
      "InvalidResponse"
    );
  }

  return body as MapboxIsochroneResponse;
}

interface GeocodeFeature {
  id: string;
  type: string;
  properties: {
    mapbox_id: string;
    name: string;
    full_address?: string;
    place_formatted?: string;
    feature_type?: string;
    context?: {
      neighborhood?: { name: string };
      place?: { name: string };
      region?: { name: string };
      country?: { name: string };
    };
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}

interface GeocodeResponse {
  type: string;
  features: GeocodeFeature[];
}

export async function fetchGeocodeSearch(
  q: string,
  limit: number,
  proximity?: string
): Promise<GeocodeResponse> {
  const token = getToken();

  const params = new URLSearchParams({
    q,
    limit: String(limit),
    language: "en",
    access_token: token,
  });

  if (proximity) {
    params.set("proximity", proximity);
  }

  const url = `https://api.mapbox.com/search/geocode/v6/forward?${params}`;

  const response = await fetch(url);
  const body = (await response.json()) as GeocodeResponse;

  if (!response.ok) {
    throw new MapboxError("Mapbox Geocoding API error", response.status);
  }

  return body;
}

export function mapboxErrorToResponse(err: unknown): Response {
  if (err instanceof MapboxError) {
    if (err.statusCode === 429) {
      return Response.json(
        { error: "Rate limit exceeded", message: "Too many requests to routing service" },
        { status: 429 }
      );
    }
    if (err.mapboxCode === "NoRoute" || err.statusCode === 422) {
      return Response.json(
        { error: "No route found", message: err.message },
        { status: 422 }
      );
    }
    return Response.json(
      { error: "Routing service error", message: err.message },
      { status: 502 }
    );
  }
  return Response.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
