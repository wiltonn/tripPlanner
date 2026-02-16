import { NextRequest } from "next/server";
import { SearchRequestSchema, SearchResultSchema } from "@trip-planner/core";
import type { SearchResult } from "@trip-planner/core";
import { fetchGeocodeSearch, mapboxErrorToResponse } from "@/lib/mapbox-server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = Object.fromEntries(searchParams.entries());

  const parsed = SearchRequestSchema.safeParse(query);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { q, proximity, limit } = parsed.data;

  try {
    const geocodeResponse = await fetchGeocodeSearch(q, limit, proximity);

    const results: SearchResult[] = geocodeResponse.features.map((f) => {
      const ctx = f.properties.context;
      const contextParts: string[] = [];
      if (ctx?.neighborhood?.name) contextParts.push(ctx.neighborhood.name);
      if (ctx?.place?.name) contextParts.push(ctx.place.name);
      if (ctx?.region?.name) contextParts.push(ctx.region.name);

      const result: SearchResult = {
        id: f.properties.mapbox_id ?? f.id,
        name: f.properties.name,
        address: f.properties.full_address ?? f.properties.place_formatted ?? "",
        category: f.properties.feature_type ?? "place",
        coordinates: f.geometry.coordinates,
        context: contextParts.join(", "),
      };

      SearchResultSchema.parse(result);
      return result;
    });

    return Response.json({ results });
  } catch (err) {
    return mapboxErrorToResponse(err);
  }
}
