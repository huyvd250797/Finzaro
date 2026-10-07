import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Verified auth context for Server Components / Server Actions.
 * React cache deduplicates repeated auth checks inside the same request (layout + page),
 * and getClaims avoids the extra getUser round-trip that previously made navigation feel sluggish.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : undefined;

  if (claimsError || !userId) {
    redirect("/login?error=Vui+lòng+đăng+nhập+để+tiếp+tục.");
  }

  const email = typeof claims?.email === "string" ? claims.email : undefined;
  return {
    supabase,
    userId,
    user: { id: userId, email }
  };
});
