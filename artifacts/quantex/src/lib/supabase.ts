// Re-export the shared Supabase client from the API client library
import { configureSupabase, getSupabase } from "@workspace/api-client-react";

// Auto-configure on import using Vite env vars
const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
} else {
  configureSupabase(url, anonKey);
}

export const supabase = getSupabase();
