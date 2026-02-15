import Fastify from "fastify";
import { prisma } from "@trip-planner/db";
import { validateEnv } from "./env";
import { healthRoutes } from "./routes/health";
import { directionsRoutes } from "./routes/directions";
import { isochroneRoutes } from "./routes/isochrone";
import { tripRoutes } from "./routes/trips";
import { dayPlanRoutes } from "./routes/day-plans";
import { placeRoutes } from "./routes/places";

const env = validateEnv();

async function main() {
  const app = Fastify({ logger: true });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  app.register(healthRoutes);
  app.register(directionsRoutes);
  app.register(isochroneRoutes);
  app.register(tripRoutes);
  app.register(dayPlanRoutes);
  app.register(placeRoutes);

  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
