import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("source", "pwa");

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (!error && typeof data?.claims?.sub === "string") {
      return NextResponse.redirect(new URL("/overview", request.url), 307);
    }
  } catch {
    // A fresh installed PWA may have no auth cookies yet. Auth bootstrap must
    // fail open to Login instead of surfacing a Server Component error.
  }

  return NextResponse.redirect(loginUrl, 307);
}
