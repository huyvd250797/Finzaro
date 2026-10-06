import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requirePublicSupabaseConfig } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export function createPublicClient() {
  const { url, publishableKey } = requirePublicSupabaseConfig();

  return createSupabaseClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
}
