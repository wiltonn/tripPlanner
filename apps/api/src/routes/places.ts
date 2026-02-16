import type { FastifyPluginAsync } from "fastify";
import {
  CreatePlaceSchema,
  UpdatePlaceSchema,
  ReorderPlacesSchema,
} from "@trip-planner/core";
import type { Database } from "@trip-planner/db";

type PlaceRow = Database["public"]["Tables"]["places"]["Row"];

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

      const { data, error } = await request.supabase
        .from("places")
        .insert({
          organization_id: request.organizationId,
          day_plan_id: request.params.dayPlanId,
          name: parsed.data.name,
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          address: parsed.data.address ?? null,
          category: parsed.data.category ?? null,
          sort_order: parsed.data.sortOrder,
        })
        .select()
        .single();

      if (error) {
        return reply.status(400).send({ error: error.message });
      }

      return reply.status(201).send(data);
    },
  );

  // List places for day
  app.get<{ Params: { dayPlanId: string } }>(
    "/days/:dayPlanId/places",
    async (request, reply) => {
      const { data, error } = await request.supabase
        .from("places")
        .select("*")
        .eq("day_plan_id", request.params.dayPlanId)
        .order("sort_order", { ascending: true });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return data;
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

      const updateData: Record<string, unknown> = {};
      if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
      if (parsed.data.lat !== undefined) updateData.lat = parsed.data.lat;
      if (parsed.data.lng !== undefined) updateData.lng = parsed.data.lng;
      if (parsed.data.address !== undefined)
        updateData.address = parsed.data.address;
      if (parsed.data.category !== undefined)
        updateData.category = parsed.data.category;
      if (parsed.data.sortOrder !== undefined)
        updateData.sort_order = parsed.data.sortOrder;

      const { data, error } = await request.supabase
        .from("places")
        .update(updateData)
        .eq("id", request.params.id)
        .select()
        .single();

      if (error || !data) {
        return reply.status(404).send({ error: "Place not found" });
      }

      return data;
    },
  );

  // Delete place
  app.delete<{ Params: { id: string } }>(
    "/places/:id",
    async (request, reply) => {
      const { error } = await request.supabase
        .from("places")
        .delete()
        .eq("id", request.params.id);

      if (error) {
        return reply.status(404).send({ error: "Place not found" });
      }

      return reply.status(204).send();
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

      // Supabase doesn't have transactions via JS client,
      // so we upsert each place's sort_order sequentially
      const results: PlaceRow[] = [];
      for (let i = 0; i < parsed.data.placeIds.length; i++) {
        const { data, error } = await request.supabase
          .from("places")
          .update({ sort_order: i })
          .eq("id", parsed.data.placeIds[i])
          .select()
          .single();

        if (error) {
          return reply.status(400).send({ error: error.message });
        }
        results.push(data);
      }

      return results;
    },
  );
};
