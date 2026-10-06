import { createBrowserClient } from "@supabase/ssr";
import { requirePublicSupabaseConfig } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export function createClient() {
  const { url, publishableKey } = requirePublicSupabaseConfig();
  return createBrowserClient<Database>(url, publishableKey);
}
