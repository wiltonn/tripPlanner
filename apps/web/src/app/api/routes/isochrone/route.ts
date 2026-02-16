import { NextRequest } from "next/server";
import { IsochroneRequestSchema, IsochroneResponseSchema } from "@trip-planner/core";
import type { IsochroneResponse } from "@trip-planner/core";
import { normalizeIsochrone } from "@trip-planner/map";
import { fetchIsochrone, mapboxErrorToResponse } from "@/lib/mapbox-server";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = IsochroneRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const req = parsed.data;

  try {
    const mapboxResponse = await fetchIsochrone(req);
    const normalized = normalizeIsochrone(mapboxResponse, [
      req.coordinates[0],
      req.coordinates[1],
    ]);

    const response: IsochroneResponse = {
      contours: normalized.contours,
      geojson: normalized.polygons,
      center: normalized.center,
    };

    IsochroneResponseSchema.parse(response);

    return Response.json(response);
  } catch (err) {
    return mapboxErrorToResponse(err);
  }
}
