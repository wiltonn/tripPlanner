import type { FastifyPluginAsync } from "fastify";
import { CreateTripSchema, UpdateTripSchema } from "@trip-planner/core";
import type { Database } from "@trip-planner/db";

type PlaceRow = Database["public"]["Tables"]["places"]["Row"];
type DayPlanRow = Database["public"]["Tables"]["day_plans"]["Row"];

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

    const { data, error } = await request.supabase
      .from("trips")
      .insert({
        organization_id: request.organizationId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        start_date: parsed.data.startDate.toISOString().split("T")[0],
        end_date: parsed.data.endDate.toISOString().split("T")[0],
      })
      .select()
      .single();

    if (error) {
      return reply.status(400).send({ error: error.message });
    }

    return reply.status(201).send(data);
  });

  // List trips
  app.get("/trips", async (request, reply) => {
    const { data, error } = await request.supabase
      .from("trips")
      .select("*")
      .order("start_date", { ascending: true });

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return data;
  });

  // Get trip by ID
  app.get<{ Params: { id: string } }>("/trips/:id", async (request, reply) => {
    const { data: trip, error } = await request.supabase
      .from("trips")
      .select("*")
      .eq("id", request.params.id)
      .single();

    if (error || !trip) {
      return reply.status(404).send({ error: "Trip not found" });
    }

    // Fetch day plans with places
    const { data: dayPlans } = await request.supabase
      .from("day_plans")
      .select("*")
      .eq("trip_id", request.params.id)
      .order("day_number", { ascending: true });

    const typedDayPlans = (dayPlans ?? []) as DayPlanRow[];
    const dayPlanIds = typedDayPlans.map((dp) => dp.id);

    let places: PlaceRow[] = [];
    if (dayPlanIds.length > 0) {
      const { data: placesData } = await request.supabase
        .from("places")
        .select("*")
        .in("day_plan_id", dayPlanIds)
        .order("sort_order", { ascending: true });
      places = (placesData ?? []) as PlaceRow[];
    }

    // Nest places under day plans
    const dayPlansWithPlaces = typedDayPlans.map((dp) => ({
      ...dp,
      places: places.filter((p) => p.day_plan_id === dp.id),
    }));

    return { ...trip, day_plans: dayPlansWithPlaces };
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

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined)
      updateData.description = parsed.data.description;
    if (parsed.data.startDate !== undefined)
      updateData.start_date = parsed.data.startDate
        .toISOString()
        .split("T")[0];
    if (parsed.data.endDate !== undefined)
      updateData.end_date = parsed.data.endDate.toISOString().split("T")[0];

    const { data, error } = await request.supabase
      .from("trips")
      .update(updateData)
      .eq("id", request.params.id)
      .select()
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: "Trip not found" });
    }

    return data;
  });

  // Delete trip
  app.delete<{ Params: { id: string } }>(
    "/trips/:id",
    async (request, reply) => {
      const { error } = await request.supabase
        .from("trips")
        .delete()
        .eq("id", request.params.id);

      if (error) {
        return reply.status(404).send({ error: "Trip not found" });
      }

      return reply.status(204).send();
    },
  );
};
