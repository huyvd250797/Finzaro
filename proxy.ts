import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // Splash must paint before Supabase getClaims. This route is public and never
  // exposes private data; /overview still performs its usual authenticated check.
  if (request.nextUrl.pathname === "/pwa") return NextResponse.next({ request });
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};
