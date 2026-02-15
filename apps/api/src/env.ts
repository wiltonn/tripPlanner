import { z } from "zod";

const EnvSchema = z.object({
  MAPBOX_SECRET_TOKEN: z
    .string()
    .startsWith("sk.", "MAPBOX_SECRET_TOKEN must start with sk."),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .startsWith("postgresql://", "DATABASE_URL must be a PostgreSQL connection string"),
});

type Env = z.infer<typeof EnvSchema>;

let env: Env | null = null;

export function validateEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  env = result.data;
  return env;
}

export function getEnv(): Env {
  if (!env) throw new Error("validateEnv() must be called before getEnv()");
  return env;
}
