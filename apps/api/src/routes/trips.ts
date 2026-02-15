import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@trip-planner/db";
import { CreateTripSchema, UpdateTripSchema } from "@trip-planner/core";

export const tripRoutes: FastifyPluginAsync = async (app) => {
  // Create trip
  app.post("/trips", async (request, reply) => {
    const parsed = CreateTripSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid request body",
        details: parsed.error.flatten(),
      });
    }

    const trip = await prisma.trip.create({ data: parsed.data });
    return reply.status(201).send(trip);
  });

  // List trips
  app.get("/trips", async () => {
    return prisma.trip.findMany({
      orderBy: { startDate: "asc" },
    });
  });

  // Get trip by ID
  app.get<{ Params: { id: string } }>("/trips/:id", async (request, reply) => {
    const trip = await prisma.trip.findUnique({
      where: { id: request.params.id },
      include: {
        dayPlans: {
          orderBy: { dayNumber: "asc" },
          include: {
            places: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });

    if (!trip) {
      return reply.status(404).send({ error: "Trip not found" });
    }

    return trip;
  });

  // Update trip
  app.put<{ Params: { id: string } }>("/trips/:id", async (request, reply) => {
    const parsed = UpdateTripSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid request body",
        details: parsed.error.flatten(),
      });
    }

    try {
      const trip = await prisma.trip.update({
        where: { id: request.params.id },
        data: parsed.data,
      });
      return trip;
    } catch {
      return reply.status(404).send({ error: "Trip not found" });
    }
  });

  // Delete trip
  app.delete<{ Params: { id: string } }>(
    "/trips/:id",
    async (request, reply) => {
      try {
        await prisma.trip.delete({ where: { id: request.params.id } });
        return reply.status(204).send();
      } catch {
        return reply.status(404).send({ error: "Trip not found" });
      }
    },
  );
};
