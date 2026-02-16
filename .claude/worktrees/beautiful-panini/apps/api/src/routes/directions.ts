import type { FastifyPluginAsync } from "fastify";
import { DirectionsRequestSchema } from "@trip-planner/core";
import type { DirectionsResponse } from "@trip-planner/core";
import { normalizeDirections } from "@trip-planner/map";
import { fetchDirections, MapboxClientError } from "../services/mapbox-client";
import { buildDirectionsCacheKey } from "../services/cache-key";
import { LRUCache } from "../services/lru-cache";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const cache = new LRUCache<DirectionsResponse>(200, SEVEN_DAYS_MS);

export const directionsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/routes/directions", async (request, reply) => {
    // 1. Validate request body
    const parsed = DirectionsRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid request body",
        details: parsed.error.flatten(),
      });
    }

    const req = parsed.data;

    // 2. Check cache
    const cacheKey = buildDirectionsCacheKey(req);
    const cached = cache.get(cacheKey);
    if (cached) {
      request.log.info("Serving directions from cache");
      return cached;
    }

    // 3. Fetch from Mapbox
    try {
      const mapboxResponse = await fetchDirections(req);

      // 4. Normalize into canonical GeoJSON
      const normalized = normalizeDirections(mapboxResponse, 0);

      // 5. Build response
      const response: DirectionsResponse = {
        summary: normalized.summary,
        geojson: {
          routeLines: normalized.lines,
          segments: normalized.segments,
          bbox: normalized.bbox,
        },
      };

      // 6. Cache and return
      cache.set(cacheKey, response);
      return response;
    } catch (err) {
      if (err instanceof MapboxClientError) {
        if (err.statusCode === 429) {
          return reply.status(429).send({
            error: "Rate limit exceeded",
            message: "Too many requests to routing service",
          });
        }
        if (err.mapboxCode === "NoRoute" || err.statusCode === 422) {
          return reply.status(422).send({
            error: "No route found",
            message: err.message,
          });
        }
        return reply.status(502).send({
          error: "Routing service error",
          message: err.message,
        });
      }
      throw err;
    }
  });
};
