import { CircleAlert, Gem } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PortfolioDashboard, type PortfolioHistory, type PortfolioSnapshot } from "@/components/portfolio-dashboard";
import { type Position, valuePosition } from "@/features/portfolio/core";
import { portfolioMarketQuote, marketUsdtVnd } from "@/features/portfolio/market";

export const dynamic="force-dynamic";
export default async function PortfolioPage({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}) {
  const query=await searchParams;
  const {supabase,userId}=await requireUser();
  /* eslint-disable @typescript-eslint/no-explicit-any -- Tables introduced in V4.6.0 migration; run db:types:linked after Supabase migration. */
  const db=supabase as any;
  const [positionsResult,fxResult,tradesResult,snapResult]=await Promise.all([
    db.from("portfolio_positions_v460").select("id,kind,symbol,name,variant,exchange,quote_currency,provider,quantity,cost_total,manual_price,archived").eq("user_id",userId).order("created_at",{ascending:false}).limit(151),
    db.from("portfolio_fx_v460").select("usdt_vnd").eq("user_id",userId).maybeSingle(),
    db.from("portfolio_trades_v460").select("id,side,quantity,unit_price,fee,realized_gain,traded_at,position_id").eq("user_id",userId).order("traded_at",{ascending:false}).limit(30),
    db.from("portfolio_snapshots_v460").select("snapshot_date,estimated_value_vnd").eq("user_id",userId).order("snapshot_date",{ascending:false}).limit(90)
  ]);
  const tooMany=Array.isArray(positionsResult.data)&&positionsResult.data.length>150;
  const loadError=positionsResult.error??fxResult.error??tradesResult.error??snapResult.error;
  const positions=(positionsResult.data??[]) as Position[];
  const savedFx=fxResult.data?.usdt_vnd ? Number(fxResult.data.usdt_vnd):null;
  const needsFx=positions.some(position=>position.kind==="crypto" && !position.archived && Number(position.quantity)>0);
  const autoFx=needsFx ? await marketUsdtVnd() : null;
  const fx=autoFx?.rate??savedFx;
  const fxSource=autoFx?.source??(savedFx?"Tỷ giá thủ công":"Chưa có tỷ giá");
  const valued=await Promise.all(positions.map(async position=>valuePosition(position,
    position.archived||Number(position.quantity)===0?null:await portfolioMarketQuote(position),fx)));
  return <div className="fin-page-shell mx-auto max-w-[1300px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
    <div className="mb-6"><p className="text-sm font-semibold text-[var(--primary)]">Quản lý đầu tư</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl"><Gem className="size-6 text-[var(--primary)]"/>Tài sản</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Vàng 24K · Chứng khoán Việt Nam · Crypto. Tất cả giá trị quy đổi về VND khi có tỷ giá hợp lệ.</p></div>
    {query.message && <div role="status" className="mb-4 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-500">{query.message.slice(0,250)}</div>}
    {query.error && <div role="alert" className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-500">{query.error.slice(0,250)}</div>}
    {loadError || tooMany ? <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5"><CircleAlert className="mb-2 size-6 text-amber-500"/><p className="font-bold">Chưa tải được module Tài sản</p><p className="mt-2 text-sm text-[var(--muted-foreground)]">Kiểm tra migration Finzaro V4.6.0 trên Supabase và quyền truy cập RLS. Không có dữ liệu giả nào được hiển thị.</p><p className="mt-2 text-xs text-[var(--muted-foreground)]">{loadError?.message??"Danh mục vượt giới hạn 150 mục có thể định giá đồng thời. Cần phân trang để đảm bảo tổng chính xác."}</p></div>
    : <PortfolioDashboard positions={valued} fx={fx} fxSource={fxSource} manualFx={savedFx} history={(tradesResult.data??[]) as PortfolioHistory[]} snapshots={(snapResult.data??[]) as PortfolioSnapshot[]}/>}
  </div>;
}
