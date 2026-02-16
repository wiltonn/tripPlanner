import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { createServerClient } from "@trip-planner/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@trip-planner/db";

declare module "fastify" {
  interface FastifyRequest {
    supabase: SupabaseClient<Database>;
    userId: string;
    organizationId: string;
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("supabase", null as unknown as SupabaseClient<Database>);
  app.decorateRequest("userId", "");
  app.decorateRequest("organizationId", "");

  app.addHook("preHandler", async (request, reply) => {
    // Skip auth for health + routing/search endpoints (public/Mapbox proxy)
    const path = request.url.split("?")[0];
    if (
      path === "/health" ||
      path === "/routes/directions" ||
      path === "/routes/isochrone" ||
      path === "/search/places"
    ) {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing authorization token" });
    }

    const token = authHeader.slice(7);
    const supabase = createServerClient(token);

    // Verify the JWT and get user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return reply.status(401).send({ error: "Invalid or expired token" });
    }

    // Extract organization_id from header (client must provide)
    const orgId = request.headers["x-organization-id"] as string | undefined;
    if (!orgId) {
      return reply
        .status(400)
        .send({ error: "Missing x-organization-id header" });
    }

    request.supabase = supabase;
    request.userId = user.id;
    request.organizationId = orgId;
  });
};

export default fp(authPlugin, { name: "auth" });
