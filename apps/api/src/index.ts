import Fastify from "fastify";
import { healthRoutes } from "./routes/health";
import { directionsRoutes } from "./routes/directions";

const port = Number(process.env.API_PORT) || 4000;

async function main() {
  const app = Fastify({ logger: true });

  app.register(healthRoutes);
  app.register(directionsRoutes);

  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
