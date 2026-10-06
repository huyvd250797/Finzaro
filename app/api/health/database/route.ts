import { NextResponse } from "next/server";
import { getFinzaroEnvironment, getPublicSupabaseConfig } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export async function GET() {
  const environment = getFinzaroEnvironment();
  const config = getPublicSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        connected: false,
        environment,
        message: "Supabase DEV environment variables are not configured."
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const startedAt = Date.now();

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("supported_currencies")
      .select("code")
      .eq("is_active", true)
      .limit(10);

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        ok: true,
        configured: true,
        connected: true,
        environment,
        latencyMs: Date.now() - startedAt,
        referenceRows: data?.length ?? 0
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        connected: false,
        environment,
        latencyMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : "Database health check failed."
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
