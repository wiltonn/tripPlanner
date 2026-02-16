import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Server-side: per-request client with user's JWT (RLS enforced).
 * Use this in API route handlers where the user's access token is available.
 */
export function createServerClient(
  accessToken: string
): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    }
  );
}

/**
 * Admin client (bypasses RLS). Use only for system operations
 * like creating initial org memberships, migrations, etc.
 */
export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
