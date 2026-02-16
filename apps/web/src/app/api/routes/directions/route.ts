import { NextRequest } from "next/server";
import { DirectionsRequestSchema } from "@trip-planner/core";
import type { DirectionsResponse } from "@trip-planner/core";
import { normalizeDirections } from "@trip-planner/map";
import { fetchDirections, mapboxErrorToResponse } from "@/lib/mapbox-server";

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

  const parsed = DirectionsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const mapboxResponse = await fetchDirections(parsed.data);
    const normalized = normalizeDirections(mapboxResponse, 0);

    const response: DirectionsResponse = {
      summary: normalized.summary,
      geojson: {
        routeLines: normalized.lines,
        segments: normalized.segments,
        bbox: normalized.bbox,
      },
    };

    return Response.json(response);
  } catch (err) {
    return mapboxErrorToResponse(err);
  }
}
