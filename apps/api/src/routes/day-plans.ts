import type { FastifyPluginAsync } from "fastify";
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

      const { data, error } = await request.supabase
        .from("day_plans")
        .insert({
          organization_id: request.organizationId,
          trip_id: request.params.tripId,
          date: parsed.data.date.toISOString().split("T")[0],
          day_number: parsed.data.dayNumber,
          notes: parsed.data.notes ?? null,
        })
        .select()
        .single();

      if (error) {
        return reply.status(400).send({ error: error.message });
      }

      return reply.status(201).send(data);
    },
  );

  // List day plans for trip
  app.get<{ Params: { tripId: string } }>(
    "/trips/:tripId/days",
    async (request, reply) => {
      const { data, error } = await request.supabase
        .from("day_plans")
        .select("*, places(*)")
        .eq("trip_id", request.params.tripId)
        .order("day_number", { ascending: true });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return data;
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

    const updateData: Record<string, unknown> = {};
    if (parsed.data.date !== undefined)
      updateData.date = parsed.data.date.toISOString().split("T")[0];
    if (parsed.data.dayNumber !== undefined)
      updateData.day_number = parsed.data.dayNumber;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

    const { data, error } = await request.supabase
      .from("day_plans")
      .update(updateData)
      .eq("id", request.params.id)
      .select()
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: "Day plan not found" });
    }

    return data;
  });

  // Delete day plan
  app.delete<{ Params: { id: string } }>(
    "/days/:id",
    async (request, reply) => {
      const { error } = await request.supabase
        .from("day_plans")
        .delete()
        .eq("id", request.params.id);

      if (error) {
        return reply.status(404).send({ error: "Day plan not found" });
      }

      return reply.status(204).send();
    },
  );
};
