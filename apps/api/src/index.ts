import Fastify from "fastify";
import { validateEnv } from "./env";
import { healthRoutes } from "./routes/health";
import { directionsRoutes } from "./routes/directions";

const env = validateEnv();

async function main() {
  const app = Fastify({ logger: true });

  app.register(healthRoutes);
  app.register(directionsRoutes);

  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
