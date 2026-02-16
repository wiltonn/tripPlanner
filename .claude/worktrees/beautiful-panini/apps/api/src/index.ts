import Fastify from "fastify";
import { validateEnv } from "./env";
import authPlugin from "./plugins/auth";
import { healthRoutes } from "./routes/health";
import { directionsRoutes } from "./routes/directions";
import { isochroneRoutes } from "./routes/isochrone";
import { tripRoutes } from "./routes/trips";
import { dayPlanRoutes } from "./routes/day-plans";
import { placeRoutes } from "./routes/places";
import { searchRoutes } from "./routes/search";

const env = validateEnv();

async function main() {
  const app = Fastify({ logger: true });

  // Register auth plugin (decorates requests with supabase client)
  await app.register(authPlugin);

  app.register(healthRoutes);
  app.register(directionsRoutes);
  app.register(isochroneRoutes);
  app.register(tripRoutes);
  app.register(dayPlanRoutes);
  app.register(placeRoutes);
  app.register(searchRoutes);

  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
