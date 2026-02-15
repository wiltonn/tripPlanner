import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@trip-planner/db";
import {
  CreatePlaceSchema,
  UpdatePlaceSchema,
  ReorderPlacesSchema,
} from "@trip-planner/core";

export const placeRoutes: FastifyPluginAsync = async (app) => {
  // Create place
  app.post<{ Params: { dayPlanId: string } }>(
    "/days/:dayPlanId/places",
    async (request, reply) => {
      const parsed = CreatePlaceSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Invalid request body",
          details: parsed.error.flatten(),
        });
      }

      try {
        const place = await prisma.place.create({
          data: {
            ...parsed.data,
            dayPlanId: request.params.dayPlanId,
          },
        });
        return reply.status(201).send(place);
      } catch {
        return reply.status(404).send({ error: "Day plan not found" });
      }
    },
  );

  // List places for day
  app.get<{ Params: { dayPlanId: string } }>(
    "/days/:dayPlanId/places",
    async (request) => {
      return prisma.place.findMany({
        where: { dayPlanId: request.params.dayPlanId },
        orderBy: { sortOrder: "asc" },
      });
    },
  );

  // Update place
  app.put<{ Params: { id: string } }>(
    "/places/:id",
    async (request, reply) => {
      const parsed = UpdatePlaceSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Invalid request body",
          details: parsed.error.flatten(),
        });
      }

      try {
        const place = await prisma.place.update({
          where: { id: request.params.id },
          data: parsed.data,
        });
        return place;
      } catch {
        return reply.status(404).send({ error: "Place not found" });
      }
    },
  );

  // Delete place
  app.delete<{ Params: { id: string } }>(
    "/places/:id",
    async (request, reply) => {
      try {
        await prisma.place.delete({ where: { id: request.params.id } });
        return reply.status(204).send();
      } catch {
        return reply.status(404).send({ error: "Place not found" });
      }
    },
  );

  // Reorder places
  app.put<{ Params: { dayPlanId: string } }>(
    "/days/:dayPlanId/places/reorder",
    async (request, reply) => {
      const parsed = ReorderPlacesSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Invalid request body",
          details: parsed.error.flatten(),
        });
      }

      const updates = parsed.data.placeIds.map((id, index) =>
        prisma.place.update({
          where: { id },
          data: { sortOrder: index },
        }),
      );

      const places = await prisma.$transaction(updates);
      return places;
    },
  );
};
