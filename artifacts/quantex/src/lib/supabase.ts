// Re-export the shared Supabase client from the API client library
import { configureSupabase, getSupabase } from "@workspace/api-client-react";

// Auto-configure on import using Vite env vars
const url = (import.meta.env.VITE_SUPABASE_URL ?? "") as string;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "") as string;

const trimmedUrl = url.trim();
const trimmedKey = anonKey.trim();

if (!trimmedUrl || !trimmedKey) {
  console.error(
    "[QUANTEX] Missing Supabase env vars. " +
    "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel project settings."
  );
} else if (!trimmedUrl.startsWith("https://")) {
  console.error(
    "[QUANTEX] VITE_SUPABASE_URL must start with https://. Got:",
    trimmedUrl.slice(0, 30) + "..."
  );
} else {
  configureSupabase(trimmedUrl, trimmedKey);
}

export const supabase = getSupabase();
