import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@trip-planner/db";
import { CreateDayPlanSchema, UpdateDayPlanSchema } from "@trip-planner/core";

export const dayPlanRoutes: FastifyPluginAsync = async (app) => {
  // Create day plan
  app.post<{ Params: { tripId: string } }>(
    "/trips/:tripId/days",
    async (request, reply) => {
      const parsed = CreateDayPlanSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Invalid request body",
          details: parsed.error.flatten(),
        });
      }

      try {
        const dayPlan = await prisma.dayPlan.create({
          data: {
            ...parsed.data,
            tripId: request.params.tripId,
          },
        });
        return reply.status(201).send(dayPlan);
      } catch {
        return reply.status(404).send({ error: "Trip not found" });
      }
    },
  );

  // List day plans for trip
  app.get<{ Params: { tripId: string } }>(
    "/trips/:tripId/days",
    async (request) => {
      return prisma.dayPlan.findMany({
        where: { tripId: request.params.tripId },
        orderBy: { dayNumber: "asc" },
        include: {
          places: { orderBy: { sortOrder: "asc" } },
        },
      });
    },
  );

  // Update day plan
  app.put<{ Params: { id: string } }>("/days/:id", async (request, reply) => {
    const parsed = UpdateDayPlanSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid request body",
        details: parsed.error.flatten(),
      });
    }

    try {
      const dayPlan = await prisma.dayPlan.update({
        where: { id: request.params.id },
        data: parsed.data,
      });
      return dayPlan;
    } catch {
      return reply.status(404).send({ error: "Day plan not found" });
    }
  });

  // Delete day plan
  app.delete<{ Params: { id: string } }>(
    "/days/:id",
    async (request, reply) => {
      try {
        await prisma.dayPlan.delete({ where: { id: request.params.id } });
        return reply.status(204).send();
      } catch {
        return reply.status(404).send({ error: "Day plan not found" });
      }
    },
  );
};
