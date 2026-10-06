import { NextResponse } from "next/server";
import { APP_RELEASE_NAME, APP_VERSION } from "@/lib/app-version";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      version: APP_VERSION,
      release: APP_RELEASE_NAME,
      checkedAt: new Date().toISOString()
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
      }
    }
  );
}
