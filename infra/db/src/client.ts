import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

/**
 * Server-side: per-request client with user's JWT (RLS enforced).
 * Use this in API route handlers where the user's access token is available.
 */
export function createServerClient(
  accessToken: string
): SupabaseClient<Database> {
  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }
  return createClient<Database>(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

/**
 * Admin client (bypasses RLS). Use only for system operations
 * like creating initial org memberships, migrations, etc.
 */
let _admin: SupabaseClient<Database> | null = null;
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!_admin) {
    if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    _admin = createClient<Database>(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _admin;
}
