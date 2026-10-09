import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchSsiQuotes, hasSsiMarketDataConfig } from "@/lib/market-data/ssi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function dateForTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    const userId = !claimsError && typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!hasSsiMarketDataConfig()) return NextResponse.json({ ok: false, configured: false, error: "Chưa cấu hình SSI FastConnect API Key/Secret trên Vercel." }, { status: 503 });

    const [{ data: assets, error: assetError }, { data: preference }] = await Promise.all([
      (supabase as any).from("investment_assets").select("id,ticker_symbol,quantity,currency_code,is_archived,auto_price_enabled,market_data_provider").eq("user_id", userId).eq("asset_type", "stock").eq("is_archived", false).eq("auto_price_enabled", true).eq("market_data_provider", "ssi").not("ticker_symbol", "is", null).limit(30),
      supabase.from("user_preferences").select("timezone").eq("id", userId).maybeSingle()
    ]);
    if (assetError) throw assetError;
    const rows = (assets ?? []) as Array<{ id: string; ticker_symbol: string; quantity: number | string | null; currency_code: string }>;
    if (rows.length === 0) return NextResponse.json({ ok: true, configured: true, updated: 0, quotes: [] }, { headers: { "Cache-Control": "no-store" } });

    const quotes = await fetchSsiQuotes(rows.map((row) => row.ticker_symbol));
    const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
    const valuationDate = dateForTimeZone(preference?.timezone ?? "Asia/Ho_Chi_Minh");
    let updated = 0;

    for (const asset of rows) {
      const quote = bySymbol.get(asset.ticker_symbol.toUpperCase());
      const quantity = Number(asset.quantity ?? 0);
      if (!quote || !Number.isFinite(quantity) || quantity <= 0 || asset.currency_code !== "VND") continue;
      const marketPriceMinor = Math.round(quote.price);
      const currentValueMinor = Math.round(marketPriceMinor * quantity);
      const { error } = await (supabase as any).from("investment_assets").update({
        market_price_minor: marketPriceMinor,
        current_value_minor: currentValueMinor,
        market_price_updated_at: new Date().toISOString(),
        valuation_date: valuationDate
      }).eq("id", asset.id).eq("user_id", userId);
      if (!error) updated += 1;
    }

    return NextResponse.json({ ok: true, configured: true, updated, quotes, refreshedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, configured: hasSsiMarketDataConfig(), error: error instanceof Error ? error.message : "Không thể cập nhật giá SSI." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
