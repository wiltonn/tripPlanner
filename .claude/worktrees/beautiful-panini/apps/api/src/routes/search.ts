import type { FastifyPluginAsync } from "fastify";
import { SearchRequestSchema, SearchResultSchema } from "@trip-planner/core";
import type { SearchResult } from "@trip-planner/core";
import { getEnv } from "../env";
import { MapboxClientError } from "../services/mapbox-client";

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

function extractCategory(feature: GeocodeFeature): string {
  return feature.properties.feature_type ?? "place";
}

function extractContext(feature: GeocodeFeature): string {
  const ctx = feature.properties.context;
  if (!ctx) return "";
  const parts: string[] = [];
  if (ctx.neighborhood?.name) parts.push(ctx.neighborhood.name);
  if (ctx.place?.name) parts.push(ctx.place.name);
  if (ctx.region?.name) parts.push(ctx.region.name);
  return parts.join(", ");
}

export const searchRoutes: FastifyPluginAsync = async (app) => {
  app.get("/search/places", async (request, reply) => {
    const parsed = SearchRequestSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid query parameters",
        details: parsed.error.flatten(),
      });
    }

    const { q, proximity, limit } = parsed.data;
    const { MAPBOX_SECRET_TOKEN } = getEnv();

    const params = new URLSearchParams({
      q,
      limit: String(limit),
      language: "en",
      access_token: MAPBOX_SECRET_TOKEN,
    });

    if (proximity) {
      params.set("proximity", proximity);
    }

    const url = `https://api.mapbox.com/search/geocode/v6/forward?${params}`;

    try {
      const response = await fetch(url);
      const body = (await response.json()) as GeocodeResponse;

      if (!response.ok) {
        throw new MapboxClientError(
          "Mapbox Geocoding API error",
          response.status
        );
      }

      const results: SearchResult[] = body.features.map((f) => {
        const result: SearchResult = {
          id: f.properties.mapbox_id ?? f.id,
          name: f.properties.name,
          address: f.properties.full_address ?? f.properties.place_formatted ?? "",
          category: extractCategory(f),
          coordinates: f.geometry.coordinates,
          context: extractContext(f),
        };
        SearchResultSchema.parse(result);
        return result;
      });

      return { results };
    } catch (err) {
      if (err instanceof MapboxClientError) {
        return reply.status(err.statusCode >= 500 ? 502 : err.statusCode).send({
          error: "Search service error",
          message: err.message,
        });
      }
      throw err;
    }
  });
};
