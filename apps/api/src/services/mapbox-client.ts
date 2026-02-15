import type { DirectionsRequest, IsochroneRequest } from "@trip-planner/core";
import type { MapboxDirectionsResponse } from "@trip-planner/map";
import { getEnv } from "../env";

export class MapboxClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public mapboxCode?: string
  ) {
    super(message);
    this.name = "MapboxClientError";
  }
}

export async function fetchDirections(
  req: DirectionsRequest
): Promise<MapboxDirectionsResponse> {
  const { MAPBOX_SECRET_TOKEN } = getEnv();

  const coords = req.coordinates
    .map(([lon, lat]) => `${lon},${lat}`)
    .join(";");

  const params = new URLSearchParams({
    geometries: "geojson",
    steps: "true",
    overview: "full",
    alternatives: String(req.alternatives),
    access_token: MAPBOX_SECRET_TOKEN,
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
    throw new MapboxClientError(
      body.message ?? "Mapbox API error",
      response.status,
      body.code
    );
  }

  if (body.code !== "Ok") {
    throw new MapboxClientError(
      body.message ?? `Mapbox returned code: ${body.code}`,
      422,
      body.code
    );
  }

  if (!body.routes || body.routes.length === 0) {
    throw new MapboxClientError("No route found", 422, "NoRoute");
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
  const { MAPBOX_SECRET_TOKEN } = getEnv();

  const [lon, lat] = req.coordinates;

  const params = new URLSearchParams({
    contours_minutes: req.contours_minutes.join(","),
    polygons: "true",
    denoise: "0.3",
    generalize: "10",
    access_token: MAPBOX_SECRET_TOKEN,
  });

  const url = `https://api.mapbox.com/isochrone/v1/mapbox/${req.profile}/${lon},${lat}?${params}`;

  const response = await fetch(url);
  const body = await response.json();

  if (!response.ok) {
    throw new MapboxClientError(
      body.message ?? "Mapbox Isochrone API error",
      response.status,
      body.code
    );
  }

  if (!body.features || !Array.isArray(body.features)) {
    throw new MapboxClientError(
      "Invalid isochrone response: missing features",
      422,
      "InvalidResponse"
    );
  }

  return body as MapboxIsochroneResponse;
}
