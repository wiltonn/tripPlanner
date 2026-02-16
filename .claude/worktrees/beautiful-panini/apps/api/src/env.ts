import { z } from "zod";

const EnvSchema = z.object({
  MAPBOX_SECRET_TOKEN: z
    .string()
    .startsWith("sk.", "MAPBOX_SECRET_TOKEN must start with sk."),
  API_PORT: z.coerce.number().int().positive().default(4000),
  SUPABASE_URL: z
    .string()
    .url("SUPABASE_URL must be a valid URL"),
  SUPABASE_ANON_KEY: z
    .string()
    .min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
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
