import type { FastifyPluginAsync } from "fastify";
import { IsochroneRequestSchema, IsochroneResponseSchema } from "@trip-planner/core";
import type { IsochroneResponse } from "@trip-planner/core";
import { normalizeIsochrone } from "@trip-planner/map";
import { fetchIsochrone, MapboxClientError } from "../services/mapbox-client";
import { buildIsochroneCacheKey } from "../services/cache-key";
import { LRUCache } from "../services/lru-cache";

const ONE_HOUR_MS = 60 * 60 * 1000;
const cache = new LRUCache<IsochroneResponse>(100, ONE_HOUR_MS);

export const isochroneRoutes: FastifyPluginAsync = async (app) => {
  app.post("/routes/isochrone", async (request, reply) => {
    // 1. Validate request body
    const parsed = IsochroneRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid request body",
        details: parsed.error.flatten(),
      });
    }

    const req = parsed.data;

    // 2. Check cache
    const cacheKey = buildIsochroneCacheKey(req);
    const cached = cache.get(cacheKey);
    if (cached) {
      request.log.info("Serving isochrone from cache");
      return cached;
    }

    // 3. Fetch from Mapbox
    try {
      const mapboxResponse = await fetchIsochrone(req);

      // 4. Normalize into canonical GeoJSON
      const normalized = normalizeIsochrone(mapboxResponse, [
        req.coordinates[0],
        req.coordinates[1],
      ]);

      // 5. Build response
      const response: IsochroneResponse = {
        contours: normalized.contours,
        geojson: normalized.polygons,
        center: normalized.center,
      };

      // 6. Validate outgoing response
      IsochroneResponseSchema.parse(response);

      // 7. Cache and return
      cache.set(cacheKey, response);
      return response;
    } catch (err) {
      if (err instanceof MapboxClientError) {
        if (err.statusCode === 429) {
          return reply.status(429).send({
            error: "Rate limit exceeded",
            message: "Too many requests to isochrone service",
          });
        }
        if (err.statusCode === 422) {
          return reply.status(422).send({
            error: "Isochrone generation failed",
            message: err.message,
          });
        }
        return reply.status(502).send({
          error: "Isochrone service error",
          message: err.message,
        });
      }
      throw err;
    }
  });
};
