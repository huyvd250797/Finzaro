"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Archive, ArrowDown, ArrowUp, Bitcoin, CheckCircle2, ChevronDown, CircleAlert, Gem, History, Pencil, Plus, RefreshCw, Search, TrendingUp, Wallet, X } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { SheetFormActions } from "@/components/sheet-form-actions";
import { PortfolioAssetSheet, type OpeningTrade, assetNames } from "@/components/portfolio-asset-sheet";
import type { AssetKind, ValuedPosition } from "@/features/portfolio/core";
import { goldUnits, summarizePortfolio } from "@/features/portfolio/core";
import { portfolioTrade, savePortfolioFx, savePortfolioSnapshot, updatePortfolioPosition } from "@/features/portfolio/actions";

const money=(n:number)=>new Intl.NumberFormat("vi-VN",{maximumFractionDigits:0}).format(n)+" đ";
const decimals=(n:number,max=8)=>new Intl.NumberFormat("vi-VN",{maximumFractionDigits:max}).format(n);
const percent=(n:number)=>`${n>0?"+":""}${new Intl.NumberFormat("vi-VN",{maximumFractionDigits:2}).format(n)}%`;
const kinds:AssetKind[]=["gold","stock","crypto"];
const icons={gold:Gem,stock:TrendingUp,crypto:Bitcoin};
const kindColor:Record<AssetKind,string>={gold:"#D3A23A",stock:"#32B58D",crypto:"#7F97EE"};
const input="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold outline-none focus:border-[var(--primary)]";
const label="block text-xs font-bold text-[var(--muted-foreground)]";
const softButton="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold transition-colors hover:bg-[var(--muted)]";
const actionButton="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white disabled:opacity-60";

function Submit({children,primary=false}:{children:React.ReactNode;primary?:boolean}){
  const {pending}=useFormStatus();return <button type="submit" disabled={pending} className={primary?actionButton:softButton}>{pending?"Đang lưu...":children}</button>;
}
export type PortfolioHistory={id:string;side:"buy"|"sell";quantity:string;unit_price:string;fee:string;realized_gain:string|null;traded_at:string;position_id:string};
export type PortfolioSnapshot={snapshot_date:string;estimated_value_vnd:string};

export function PortfolioDashboard({positions,fx,fxSource,manualFx,history,snapshots,openingTrades}:{
  positions:ValuedPosition[];fx:number|null;fxSource:string;manualFx:number|null;
  history:PortfolioHistory[];snapshots:PortfolioSnapshot[];openingTrades:OpeningTrade[];
}){
  const router=useRouter();
  const [refreshing,startRefresh]=useTransition();
  const [filter,setFilter]=useState<"all"|AssetKind>("all");
  const [search,setSearch]=useState("");
  const [goldMode,setGoldMode]=useState<"chi"|"detail">("chi");
  const [assetEditor,setAssetEditor]=useState<"create"|string|null>(null);
  const [tradeEditor,setTradeEditor]=useState<string|null>(null);
  const active=positions.filter(p=>!p.archived);
  const held=active.filter(p=>p.quantityNumber>0);
  const summary=summarizePortfolio(positions);
  const selectedAsset=assetEditor===null||assetEditor==="create"?null:positions.find(p=>p.id===assetEditor)??null;
  const selectedTrade=tradeEditor===null?null:positions.find(p=>p.id===tradeEditor)??null;
  const firstByPosition=new Map(openingTrades.map(t=>[t.position_id,t]));
  const shown=active.filter(p=>(filter==="all"||p.kind===filter)&&`${p.name} ${p.symbol}`.toLowerCase().includes(search.toLowerCase().trim()));
  const priceDate=(value:string)=>{const d=new Date(value);return Number.isNaN(d.getTime())?"":d.toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});};
  const quantity=(p:ValuedPosition)=>p.kind==="gold"?(goldMode==="chi"?`${decimals(p.quantityNumber,1)} chỉ`:goldUnits(p.quantityNumber)):`${decimals(p.quantityNumber,p.kind==="crypto"?12:0)} ${p.kind==="stock"?"CP":p.symbol}`;
  return <div className="space-y-4 sm:space-y-6">
    <section className="rounded-[26px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1"><p className="text-[11px] font-black uppercase tracking-[.14em] text-[var(--primary)]">TỔNG TÀI SẢN ĐẦU TƯ</p>
          <p className="mt-2 break-words text-[clamp(1.75rem,6vw,2.5rem)] font-black tracking-tight tabular-nums">{money(summary.value)}</p>
          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Quy đổi VND · {held.length} tài sản đang nắm giữ{summary.missing>0?" · Tạm tính":""}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" disabled={refreshing} onClick={()=>startRefresh(()=>router.refresh())} title="Cập nhật giá thị trường" aria-label="Cập nhật giá thị trường" className={`${softButton} size-11 !p-0`}><RefreshCw className={`size-4 ${refreshing?"animate-spin":""}`}/></button>
          <button type="button" onClick={()=>setAssetEditor("create")} className={actionButton}><Plus className="size-4"/>Thêm tài sản</button>
        </div>
      </div>
      {summary.missing>0&&<div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs leading-5 text-amber-700 dark:text-amber-300"><CircleAlert className="mt-0.5 size-4 shrink-0"/>{summary.missing} tài sản chưa có giá hoặc tỷ giá hợp lệ. Tổng giá trị và lãi/lỗ chỉ tính các tài sản đã định giá, không tự tính giá thiếu bằng 0.</div>}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-2xl bg-[var(--muted)]/70 p-3 sm:p-4"><p className="text-xs text-[var(--muted-foreground)]">Giá vốn được định giá</p><p className="mt-1 break-words text-base font-black tabular-nums sm:text-lg">{money(summary.cost)}</p></div>
        <div className="rounded-2xl bg-[var(--muted)]/70 p-3 sm:p-4"><p className="text-xs text-[var(--muted-foreground)]">Lãi/lỗ tạm tính</p>
          <p className={`mt-1 break-words text-base font-black tabular-nums sm:text-lg ${summary.pnl>=0?"text-[var(--fin-income)]":"text-[var(--fin-expense)]"}`}>
            {summary.pnl>0?"+":""}{money(summary.pnl)}</p><p className="text-xs font-semibold text-[var(--muted-foreground)]">{summary.cost>0?percent(summary.pnl/summary.cost*100):"Chưa có cơ sở tính %"}</p></div>
      </div>
      <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-[var(--muted)]" role="img" aria-label="Tỷ trọng danh mục theo giá trị đã định giá">
        {kinds.map(k=><div key={k} style={{width:`${summary.value>0?summary.byKind[k]/summary.value*100:0}%`,backgroundColor:kindColor[k]}}/>)}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">{kinds.map(k=>{
        const Icon=icons[k];return <button key={k} onClick={()=>setFilter(filter===k?"all":k)} type="button" className="min-w-0 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-[var(--muted)]" aria-label={`Lọc ${assetNames[k]}`}>
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--muted-foreground)]"><Icon className="size-3.5 shrink-0" style={{color:kindColor[k]}}/>{assetNames[k]}</span>
          <span className="mt-1 block break-words text-xs font-black tabular-nums sm:text-sm">{money(summary.byKind[k])}</span>
        </button>;
      })}</div>
    </section>

    <section className="rounded-[26px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-black">Danh mục tài sản</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Chạm Sửa để cập nhật thông tin hoặc giá vốn.</p></div><span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-bold">{active.length} tài sản</span></div>
      <div role="group" aria-label="Lọc loại tài sản" className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
        {(["all",...kinds] as const).map(k=><button type="button" key={k} onClick={()=>setFilter(k)} aria-pressed={filter===k}
          className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-bold transition-colors ${filter===k?"bg-[var(--primary)] text-white":"bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
          {k==="all"?"Tất cả":assetNames[k]} <span className="ml-0.5 opacity-70">{k==="all"?active.length:active.filter(p=>p.kind===k).length}</span></button>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="relative min-w-[160px] flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"/>
          <input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Tìm tên hoặc mã tài sản" aria-label="Tìm tên hoặc mã tài sản" className="min-h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-2 pl-9 pr-3 text-xs outline-none focus:border-[var(--primary)]"/>
        </label>
        {(filter==="gold"||filter==="all")&&held.some(p=>p.kind==="gold")&&<button type="button" onClick={()=>setGoldMode(m=>m==="chi"?"detail":"chi")} className={softButton} title="Đổi cách hiển thị số lượng vàng">{goldMode==="chi"?"Chỉ → Cây / phân":"Cây / phân → Chỉ"}</button>}
      </div>
      {shown.length===0?<div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] px-3 py-12 text-center">
        <Wallet className="size-9 text-[var(--muted-foreground)]"/><p className="text-sm font-bold">{active.length?"Không tìm thấy tài sản phù hợp":"Chưa có tài sản đầu tư"}</p>
        <p className="max-w-[270px] text-xs leading-5 text-[var(--muted-foreground)]">{active.length?"Thử đổi bộ lọc hoặc từ khóa tìm kiếm.":"Thêm vàng, cổ phiếu hoặc crypto để xem giá trị và lãi/lỗ tại đây."}</p>
        {!active.length&&<button type="button" onClick={()=>setAssetEditor("create")} className={`${actionButton} mt-2`}><Plus className="size-4"/>Thêm tài sản đầu tiên</button>}
      </div>:<div className="mt-4 grid gap-3 lg:grid-cols-2">{shown.map(p=>{
        const Icon=icons[p.kind];const hasPrice=p.valueVnd!==null;const gain=(p.pnlVnd??0)>=0;const pnl=p.pnlVnd;
        return <article key={p.id} className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3.5 sm:p-4">
          <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--muted)]"><Icon className="size-5" style={{color:kindColor[p.kind]}}/></span>
            <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black" title={p.name}>{p.name}</h3><p className="mt-1 break-words text-[11px] text-[var(--muted-foreground)]">{p.kind!=="gold"?`${p.symbol} · `:""}{quantity(p)}{p.quantityNumber===0?" · Đã bán hết":""}</p></div>
            <button type="button" aria-label={`Sửa tài sản ${p.name}`} onClick={()=>setAssetEditor(p.id)} className={`${softButton} shrink-0`}><Pencil className="size-3.5"/>Sửa</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[var(--muted)]/60 p-3">
            <div><p className="text-[11px] text-[var(--muted-foreground)]">Giá trị hiện tại</p><p className="mt-1 break-words text-sm font-black tabular-nums">{p.quantityNumber===0?money(0):hasPrice?money(p.valueVnd!):"Thiếu giá"}</p></div>
            <div className="border-l border-[var(--border)] pl-3"><p className="text-[11px] text-[var(--muted-foreground)]">Lãi/lỗ tạm tính</p><p className={`mt-1 break-words text-sm font-black tabular-nums ${pnl===null?"text-[var(--muted-foreground)]":gain?"text-[var(--fin-income)]":"text-[var(--fin-expense)]"}`}>
              {p.quantityNumber===0?"—":pnl===null?"Chưa xác định":`${pnl>0?"+":""}${money(pnl)}`}</p>
              {pnl!==null&&p.costVnd&&p.costVnd>0&&p.quantityNumber>0&&<p className={`text-[11px] font-semibold ${gain?"text-[var(--fin-income)]":"text-[var(--fin-expense)]"}`}>{percent(pnl/p.costVnd*100)}</p>}
            </div>
          </div>
          <div className="mt-3 space-y-1 text-[11px] leading-4 text-[var(--muted-foreground)]">
            <p>Giá vốn bình quân: <strong className="text-[var(--foreground)]">{p.quantityNumber>0?`${decimals(p.costNumber/p.quantityNumber,8)} ${p.quote_currency}/${p.kind==="gold"?"chỉ":"đơn vị"}`:"—"}</strong></p>
            <p>Giá hiện tại: <strong className="text-[var(--foreground)]">{p.quote?`${decimals(p.quote.price,8)} ${p.quote_currency}`:"Chưa có giá hợp lệ"}</strong>{p.quote?` · ${p.quote.source}${p.quote.at?` · ${priceDate(p.quote.at)}`:""}`:""}</p>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">{hasPrice?<CheckCircle2 className="size-3.5 text-[var(--fin-income)]"/>:<CircleAlert className="size-3.5 text-amber-500"/>}{hasPrice?"Đã định giá":"Chờ cập nhật giá"}</span>
            <button type="button" onClick={()=>setTradeEditor(p.id)} className={softButton}><Plus className="size-3.5"/>Mua / Bán</button>
          </div>
        </article>;
      })}</div>}
    </section>

    <section className="rounded-[26px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
      <h2 className="text-base font-black">Công cụ & lịch sử đầu tư</h2>
      <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Các thiết lập nâng cao được thu gọn để danh mục dễ theo dõi.</p>
      <details className="mt-3 rounded-xl border border-[var(--border)] p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold [&::-webkit-details-marker]:hidden"><span>Quy đổi USDT/VND · {fx?`${decimals(fx,2)} đ`:"Thiếu tỷ giá"}</span><ChevronDown className="size-4"/></summary>
        <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">Nguồn: {fxSource}. Tỷ giá thủ công được dùng khi nguồn tự động không khả dụng; không giả định USDT luôn bằng USD.</p>
        <form action={savePortfolioFx} className="mt-3 flex flex-wrap items-end gap-2"><div className="min-w-[160px] flex-1"><label htmlFor="fin-usdt" className={label}>Tỷ giá 1 USDT (VND)</label><input id="fin-usdt" name="usdt_vnd" inputMode="decimal" defaultValue={manualFx??""} className={input} required placeholder="Ví dụ 26.000"/></div><Submit><RefreshCw className="size-4"/>Lưu tỷ giá</Submit></form>
      </details>
      <details className="mt-2 rounded-xl border border-[var(--border)] p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold [&::-webkit-details-marker]:hidden"><span>Biến động giá trị danh mục</span><ChevronDown className="size-4"/></summary>
        <form action={savePortfolioSnapshot} className="mt-3 flex flex-wrap items-center gap-2"><Submit><History className="size-4"/>Lưu thống kê hôm nay</Submit><span className="text-[11px] text-[var(--muted-foreground)]">Chỉ lưu nếu tất cả tài sản đang giữ có giá hợp lệ.</span></form>
        {snapshots.length>=2&&(()=>{const values=snapshots.slice(0,30).reverse();const amounts=values.map(s=>Number(s.estimated_value_vnd));const min=Math.min(...amounts),max=Math.max(...amounts);
          const points=amounts.map((v,i)=>`${Math.round(i/Math.max(values.length-1,1)*320)},${Math.round(98-(v-min)/Math.max(max-min,1)*90)}`).join(" ");
          return <svg role="img" aria-label="Lịch sử tổng giá trị tài sản đã lưu" viewBox="0 0 320 105" className="mt-3 h-28 w-full rounded-xl bg-[var(--muted)] p-2"><polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
        })()}
        {snapshots.length===0?<p className="mt-3 text-xs text-[var(--muted-foreground)]">Chưa có thống kê được lưu.</p>:<div className="mt-3 space-y-2">{snapshots.slice(0,8).map(s=><div key={s.snapshot_date} className="flex justify-between gap-3 text-xs"><span>{s.snapshot_date.split("-").reverse().join("/")}</span><strong>{money(Number(s.estimated_value_vnd))}</strong></div>)}</div>}
      </details>
      <details className="mt-2 rounded-xl border border-[var(--border)] p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold [&::-webkit-details-marker]:hidden"><span>Giao dịch mua/bán gần đây ({history.length})</span><ChevronDown className="size-4"/></summary>
        {history.length===0?<p className="mt-3 text-xs text-[var(--muted-foreground)]">Chưa có giao dịch.</p>:<div className="mt-3 space-y-2">{history.slice(0,20).map(t=>{const owner=positions.find(p=>p.id===t.position_id);return <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--muted)] px-3 py-2 text-xs"><span className="flex items-center gap-1">{t.side==="buy"?<ArrowDown className="size-3.5 text-[var(--fin-income)]"/>:<ArrowUp className="size-3.5 text-[var(--fin-expense)]"/>}<strong>{t.side==="buy"?"Mua":"Bán"} {owner?.symbol??"Tài sản"}</strong> · {decimals(Number(t.quantity),12)} × {decimals(Number(t.unit_price),8)} {owner?.quote_currency??""}</span><span className="text-[var(--muted-foreground)]">{new Date(t.traded_at).toLocaleDateString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}{t.realized_gain!==null?` · Đã thực hiện: ${decimals(Number(t.realized_gain),2)}`:""}</span></div>;})}</div>}
      </details>
      {positions.some(p=>p.archived)&&<details className="mt-2 rounded-xl border border-[var(--border)] p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold [&::-webkit-details-marker]:hidden"><span>Tài sản lưu trữ ({positions.filter(p=>p.archived).length})</span><ChevronDown className="size-4"/></summary>
        <div className="mt-3 space-y-2">{positions.filter(p=>p.archived).map(p=><form key={p.id} action={updatePortfolioPosition} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2 text-xs"><span>{p.name} · {p.symbol}</span><input type="hidden" name="position_id" value={p.id}/><input type="hidden" name="provider" value={p.provider}/><input type="hidden" name="manual_price" value={p.manual_price??""}/><input type="hidden" name="archived" value="0"/><Submit>Khôi phục</Submit></form>)}</div>
      </details>}
    </section>
    <p className="px-1 text-xs leading-5 text-[var(--muted-foreground)]"><Wallet className="mr-1 inline size-3.5"/>Tài sản đầu tư tách biệt với Thu/Chi sinh hoạt. Ghi nhận mua/bán tại đây không tự trừ tiền trong tài khoản/ví.</p>

    <PortfolioAssetSheet key={selectedAsset?.id??assetEditor??"closed"} open={assetEditor!==null} onClose={()=>setAssetEditor(null)} asset={selectedAsset} opening={selectedAsset?firstByPosition.get(selectedAsset.id):undefined}/>
    <BottomSheet open={Boolean(selectedTrade)} onClose={()=>setTradeEditor(null)} label={`Mua bán ${selectedTrade?.name??"tài sản"}`} panelClassName="mx-auto max-w-lg sm:mb-4 sm:rounded-3xl">
      {selectedTrade&&<div className="px-4 pb-6 pt-2 sm:px-6"><div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-[var(--primary)]">GIAO DỊCH ĐẦU TƯ</p><h2 className="mt-1 text-xl font-black">Mua / Bán {selectedTrade.name}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Đang nắm giữ: {quantity(selectedTrade)}</p></div><button type="button" onClick={()=>setTradeEditor(null)} className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)]" aria-label="Đóng"><X className="size-4"/></button></div>
        <form id="portfolio-trade-form" action={portfolioTrade} className="space-y-4"><input type="hidden" name="position_id" value={selectedTrade.id}/>
          <div><label className={label} htmlFor="portfolio-side">Loại giao dịch</label><select id="portfolio-side" name="side" className={input}><option value="buy">Mua thêm</option><option value="sell">Bán bớt</option></select></div>
          <div><label className={label} htmlFor="portfolio-qty">Khối lượng ({selectedTrade.kind==="gold"?"chỉ":selectedTrade.kind==="stock"?"CP":selectedTrade.symbol})</label><input id="portfolio-qty" name="quantity" inputMode="decimal" required placeholder="Ví dụ 1" className={input}/></div>
          <div><label className={label} htmlFor="portfolio-price">Giá / đơn vị ({selectedTrade.quote_currency})</label><input id="portfolio-price" name="unit_price" inputMode="decimal" required placeholder="Giá thực tế" className={input}/></div>
          <div><label className={label} htmlFor="portfolio-fee">Phí giao dịch ({selectedTrade.quote_currency})</label><input id="portfolio-fee" name="fee" inputMode="decimal" required defaultValue="0" className={input}/></div>
          <p className="rounded-xl bg-[var(--muted)] p-3 text-xs leading-5 text-[var(--muted-foreground)]">Mua thêm và bán bớt được lưu vào lịch sử để tính giá vốn bình quân. Nếu nhập sai lần mua đầu tiên, hãy dùng nút <strong>Sửa</strong> trên card tài sản.</p>
          <SheetFormActions className="w-full justify-end border-t border-[var(--border)] bg-[var(--card)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 sm:px-6"><button type="button" onClick={()=>setTradeEditor(null)} className={softButton}>Hủy</button><button type="submit" form="portfolio-trade-form" className={actionButton}><RefreshCw className="size-4"/>Ghi nhận giao dịch</button></SheetFormActions>
        </form>
        <form action={updatePortfolioPosition} onSubmit={event=>{if(!window.confirm("Lưu trữ tài sản? Dữ liệu mua/bán vẫn được giữ lại."))event.preventDefault();}} className="mt-3 text-right"><input type="hidden" name="position_id" value={selectedTrade.id}/><input type="hidden" name="provider" value={selectedTrade.provider}/><input type="hidden" name="manual_price" value={selectedTrade.manual_price??""}/><input type="hidden" name="archived" value="1"/><button type="submit" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--fin-expense)]"><Archive className="size-3.5"/>Lưu trữ tài sản</button></form>
      </div>}
    </BottomSheet>
  </div>;
}
