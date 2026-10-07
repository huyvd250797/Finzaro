import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Safe optional auth lookup for public Login/Register/PWA bootstrap surfaces. */
export const optionalUser = cache(async () => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    const userId = !error && typeof claims?.sub === "string" ? claims.sub : undefined;
    if (!userId) return null;
    return {
      supabase,
      userId,
      user: {
        id: userId,
        email: typeof claims?.email === "string" ? claims.email : undefined
      }
    };
  } catch {
    return null;
  }
});

/**
 * Verified auth context for Server Components / Server Actions.
 * React cache deduplicates repeated auth checks inside the same request.
 * Auth/network failures redirect to Login instead of crashing an installed PWA.
 */
export const requireUser = cache(async () => {
  const current = await optionalUser();
  if (!current) {
    const params = new URLSearchParams({
      error: "Vui lòng đăng nhập để tiếp tục.",
      source: "pwa"
    });
    redirect(`/login?${params.toString()}`);
  }
  return current;
});
