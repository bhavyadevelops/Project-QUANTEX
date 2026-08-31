/**
 * Supabase client factory.
 * Call configure() once at app startup with the env values, then use getSupabase().
 * This avoids importing Vite types in the library package.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Initialize the shared Supabase client. Must be called once before any hooks run.
 */
export function configureSupabase(url: string, anonKey: string): void {
  if (!_client) {
    _client = createClient(url, anonKey);
  }
}

/**
 * Returns the configured Supabase client. Throws if configure() was never called.
 */
export function getSupabase(): SupabaseClient {
  if (!_client) {
    throw new Error(
      "Supabase client not configured. Call configureSupabase(url, anonKey) before using hooks.",
    );
  }
  return _client;
}
