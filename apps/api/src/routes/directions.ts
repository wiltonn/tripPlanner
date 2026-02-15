import type { FastifyPluginAsync } from "fastify";
import { DirectionsRequestSchema } from "@trip-planner/core";

export const directionsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/routes/directions", async (request, reply) => {
    const parsed = DirectionsRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid request body",
        details: parsed.error.flatten(),
      });
    }

    const { origin, destination } = parsed.data;

    // Mocked directions response
    const midLng = (origin.lng + destination.lng) / 2;
    const midLat = (origin.lat + destination.lat) / 2;

    return {
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [origin.lng, origin.lat],
          [midLng, midLat + 0.01],
          [destination.lng, destination.lat],
        ] as [number, number][],
      },
      distanceMeters: 4500,
      durationSeconds: 900,
    };
  });
};
