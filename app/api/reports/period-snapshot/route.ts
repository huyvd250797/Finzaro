import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { currentYearMonth, validMonthKey, validYear } from "@/features/reports/experience";
import { loadPeriodSnapshot } from "@/features/reports/load-period-snapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie" };

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { supabase, userId } = await requireUser();
    const { data: preferences, error: prefError } = await supabase.from("user_preferences")
      .select("currency_code, timezone").eq("id", userId).maybeSingle();
    if (prefError) throw prefError;
    const currency = (preferences?.currency_code ?? "VND").toUpperCase();
    const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
    const now = currentYearMonth(timeZone);
    const currentMonth = `${now.year}-${String(now.month).padStart(2, "0")}`;
    const mode: "month" | "year" = url.searchParams.get("mode") === "year" ? "year" : "month";
    const period = validMonthKey(url.searchParams.get("period") ?? undefined, currentMonth);
    const year = validYear(url.searchParams.get("year") ?? undefined, now.year);
    if ((url.searchParams.has("mode") && !["month", "year"].includes(url.searchParams.get("mode") ?? "")) ||
      (url.searchParams.has("period") && period !== url.searchParams.get("period")) ||
      (url.searchParams.has("year") && String(year) !== url.searchParams.get("year"))) {
      return NextResponse.json({ error: "Kỳ báo cáo không hợp lệ." }, { status: 400, headers: PRIVATE_HEADERS });
    }
    const { snapshot } = await loadPeriodSnapshot(supabase, userId, { mode, period, year, currency });
    return NextResponse.json(snapshot, { headers: PRIVATE_HEADERS });
  } catch (error) {
    console.error("[Finzaro Reports] period snapshot failed", error);
    return NextResponse.json({ error: "Không tải được kỳ báo cáo. Vui lòng thử lại." }, { status: 500, headers: PRIVATE_HEADERS });
  }
}
