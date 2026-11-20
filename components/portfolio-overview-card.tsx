import Link from "next/link";
import { Gem, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { type Position, summarizePortfolio, valuePosition } from "@/features/portfolio/core";
import { marketUsdtVnd, portfolioMarketQuote } from "@/features/portfolio/market";
import { formatDong } from "@/features/portfolio/display";

const money=formatDong;
/** Independent stream: does not block cashflow Dashboard when providers are unavailable. */
export async function PortfolioOverviewCard() {
  const {supabase,userId}=await requireUser();
  /* eslint-disable @typescript-eslint/no-explicit-any -- V4.6.0 schema pending local DB type regeneration. */
  const db=supabase as any;
  const [assets,fx]=await Promise.all([
    db.from("portfolio_positions_v460").select("id,kind,symbol,name,variant,exchange,quote_currency,provider,quantity,cost_total,manual_price,archived").eq("user_id",userId).eq("archived",false).limit(151),
    db.from("portfolio_fx_v460").select("usdt_vnd").eq("user_id",userId).maybeSingle()
  ]);
  if (assets.error || fx.error || (assets.data?.length??0)>150) return <Link href="/portfolio" className="fin-dashboard-card flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm font-semibold">Tài sản đầu tư · Xem chi tiết <ChevronRight className="size-4"/></Link>;
  const positions=(assets.data??[]) as Position[];
  const hasCrypto=positions.some(p=>p.kind==="crypto" && Number(p.quantity)>0);
  const liveFx=hasCrypto ? await marketUsdtVnd() : null;
  const rate=liveFx?.rate??(fx.data?.usdt_vnd ? Number(fx.data.usdt_vnd):null);
  const rows=await Promise.all(positions.map(async p=>valuePosition(p,Number(p.quantity)>0?await portfolioMarketQuote(p):null,rate)));
  const summary=summarizePortfolio(rows);
  return <Link href="/portfolio" className="fin-dashboard-card block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:bg-[var(--muted)]/30 sm:p-5">
    <div className="flex items-start justify-between gap-2"><div><p className="fin-section-eyebrow">TÀI SẢN ĐẦU TƯ</p><p className="mt-1 text-base font-extrabold">Vàng · Chứng khoán · Crypto</p></div><Gem className="size-5 text-[var(--primary)]"/></div>
    <p className="mt-3 max-w-full overflow-x-auto whitespace-nowrap text-[clamp(1.25rem,5vw,1.65rem)] font-black tabular-nums">{money(summary.value)}</p>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs"><span className={summary.pnl>=0?"text-[var(--fin-income)]":"text-[var(--fin-expense)]"}>{summary.pnl>=0?"+":""}{money(summary.pnl)} lãi/lỗ tạm tính</span><span className="flex items-center gap-1 font-bold text-[var(--primary)]">Mở danh mục <ChevronRight className="size-4"/></span></div>
    {summary.missing>0&&<p className="mt-2 text-xs text-amber-600">{summary.missing} tài sản thiếu giá/tỷ giá: tổng chưa đầy đủ.</p>}
  </Link>;
}
