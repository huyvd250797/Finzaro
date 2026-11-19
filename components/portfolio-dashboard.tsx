"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ArrowDown, ArrowUp, Bitcoin, ChevronDown, CircleAlert, Gem, History, Plus, RefreshCw, Save, TrendingUp, Wallet, X } from "lucide-react";
import type { AssetKind, ValuedPosition } from "@/features/portfolio/core";
import { goldUnits } from "@/features/portfolio/core";
import { createPortfolioPosition, portfolioTrade, savePortfolioFx, savePortfolioSnapshot, updatePortfolioPosition } from "@/features/portfolio/actions";

const money = (n:number) => new Intl.NumberFormat("vi-VN",{maximumFractionDigits:0}).format(n) + " đ";
const decimals = (n:number,max=8) => new Intl.NumberFormat("vi-VN",{maximumFractionDigits:max}).format(n);
const percent = (n:number) => `${n>0?"+":""}${new Intl.NumberFormat("vi-VN",{maximumFractionDigits:2}).format(n)}%`;
const kindNames: Record<AssetKind,string>={gold:"Vàng 9999",stock:"Chứng khoán",crypto:"Crypto"};
const kindIcons={gold:Gem,stock:TrendingUp,crypto:Bitcoin};
const kinds:AssetKind[]=["gold","stock","crypto"];
const inp="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]";
const label="block text-xs font-semibold text-[var(--muted-foreground)]";
const primary="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60";
const secondary="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold";

function Submit({children}:{children:React.ReactNode}) { const {pending}=useFormStatus(); return <button type="submit" className={primary} disabled={pending}>{pending ? "Đang lưu..." : children}</button>; }
export type PortfolioHistory = { id:string; side:"buy"|"sell"; quantity:string; unit_price:string; fee:string; realized_gain:string|null; traded_at:string; position_id:string };
export type PortfolioSnapshot = {snapshot_date:string;estimated_value_vnd:string};
export function PortfolioDashboard({positions, fx, fxSource, manualFx, history, snapshots}:{positions:ValuedPosition[];fx:number|null;fxSource:string;manualFx:number|null;history:PortfolioHistory[];snapshots:PortfolioSnapshot[]}) {
  const router=useRouter();
  const [refreshing,startRefresh]=useTransition();
  const [filter,setFilter]=useState<"all"|AssetKind>("all");
  const [goldMode,setGoldMode]=useState<"chi"|"detail">("chi");
  const [adding,setAdding]=useState(false);
  const [kind,setKind]=useState<AssetKind>("gold");
  const active=positions.filter(p=>!p.archived && p.quantityNumber>0);
  const known=active.filter(p=>p.valueVnd!==null);
  const valuation=known.reduce((sum,p)=>sum+(p.valueVnd ?? 0),0);
  const invested=known.reduce((sum,p)=>sum+(p.costVnd ?? 0),0);
  const missing=active.length-known.length;
  const pnl=valuation-invested;
  const byKind=Object.fromEntries(kinds.map(k=>[k,known.filter(p=>p.kind===k).reduce((s,p)=>s+(p.valueVnd??0),0)])) as Record<AssetKind,number>;
  const shown=filter==="all"?active:active.filter(p=>p.kind===filter);
  return <div className="space-y-5">
    <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Tổng giá trị tài sản đầu tư</p><h2 className="mt-2 text-3xl font-black tabular-nums sm:text-4xl">{money(valuation)}</h2>
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">Định giá bằng VND · không bao gồm tài khoản tiền mặt/ví</p>
        </div>
        <button className={secondary} disabled={refreshing} onClick={()=>startRefresh(()=>router.refresh())} type="button"><RefreshCw className={`size-4 ${refreshing?"animate-spin":""}`}/>{refreshing?"Đang cập nhật":"Cập nhật giá"}</button>
        <button className={secondary} onClick={()=>setAdding(v=>!v)} type="button" aria-expanded={adding}>{adding?<X className="size-4"/>:<Plus className="size-4"/>}{adding?"Đóng":"Thêm tài sản"}</button>
      </div>
      {missing>0 && <div role="status" className="mt-4 flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-300"><CircleAlert className="size-4 shrink-0"/>Còn {missing} tài sản chưa định giá đủ giá thị trường hoặc tỷ giá USDT/VND. Tổng bên trên là số tạm tính, chưa đầy đủ.</div>}
      <div className="mt-5 flex flex-wrap gap-4 text-xs sm:text-sm">
        <span>Vốn tương ứng: <strong>{money(invested)}</strong></span>
        <span>Lãi/lỗ tạm tính: <strong className={pnl>=0?"text-[var(--fin-income)]":"text-[var(--fin-expense)]"}>{pnl>=0?"+":""}{money(pnl)} {invested>0?`(${percent(pnl/invested*100)})`:""}</strong></span>
      </div>
      <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-[var(--muted)]" role="img" aria-label="Cơ cấu tài sản theo giá trị đã định giá">
        {kinds.map(k=><div key={k} style={{width:`${valuation>0?byKind[k]/valuation*100:0}%`,backgroundColor:k==="gold"?"#D4A43B":k==="stock"?"#33B896":"#6D8FEA"}}/>)}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">{kinds.map(k=>{const Icon=kindIcons[k];return <button onClick={()=>setFilter(k)} type="button" key={k} className="rounded-xl border border-[var(--border)] p-2 text-left text-xs hover:bg-[var(--muted)]"><span className="inline-flex items-center gap-1 font-bold"><Icon className="size-3.5"/>{kindNames[k]}</span><span className="mt-1 block break-words font-semibold tabular-nums">{money(byKind[k])}</span></button>;})}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        <form action={savePortfolioSnapshot}><Submit><Save className="size-4"/>Lưu thống kê hôm nay</Submit></form>
        <span className="self-center text-[11px] text-[var(--muted-foreground)]">Chỉ lưu khi mọi tài sản có giá và tỷ giá hợp lệ.</span>
      </div>
    </section>
    {adding && <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5" id="add-portfolio">
      <h2 className="mb-4 text-lg font-black">Thêm tài sản đầu tư</h2>
      <div className="mb-4 grid grid-cols-3 gap-2" role="group" aria-label="Loại tài sản">{kinds.map(k=><button key={k} type="button" onClick={()=>setKind(k)} aria-pressed={kind===k} className={`min-h-11 rounded-xl border px-1 text-xs font-bold ${kind===k?"border-[var(--primary)] bg-[var(--sidebar-accent)] text-[var(--primary)]":"border-[var(--border)]"}`}>{kindNames[k]}</button>)}</div>
      <form action={createPortfolioPosition} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="kind" value={kind}/>
        {kind==="gold"?<div><label className={label} htmlFor="gold-variant">Loại vàng 24K/9999</label><select id="gold-variant" name="variant" className={inp} defaultValue="pnj_ring"><option value="pnj_ring">Nhẫn trơn PNJ 9999</option><option value="sjc_bar">Vàng miếng SJC</option><option value="other_ring">Nhẫn 9999 khác (nhập giá)</option></select></div>
          :<div><label className={label} htmlFor="asset-symbol">Mã {kind==="stock"?"cổ phiếu":"crypto"}</label><input id="asset-symbol" name="symbol" className={inp} placeholder={kind==="stock"?"MBB, VND, PVD...":"BTC, ETH, SOL..."} autoCapitalize="characters" required maxLength={15}/></div>}
        {kind==="stock"&&<div><label className={label} htmlFor="asset-exchange">Sàn</label><select id="asset-exchange" name="exchange" className={inp}><option value="HOSE">HOSE</option><option value="HNX">HNX</option><option value="UPCOM">UPCOM</option></select></div>}
        <div><label className={label} htmlFor="asset-quantity">Khối lượng ({kind==="gold"?"chỉ · 12,3 = 1 cây 2 chỉ 3 phân":kind==="stock"?"cổ phiếu":"đồng coin"})</label><input id="asset-quantity" className={inp} name="quantity" inputMode="decimal" placeholder={kind==="gold"?"12,3":kind==="stock"?"200":"2,5"} required/></div>
        <div><label className={label} htmlFor="asset-buy">Giá mua mỗi {kind==="gold"?"chỉ (VND)":kind==="stock"?"cổ phiếu (VND)":"coin (USDT)"}</label><input id="asset-buy" className={inp} name="buy_price" inputMode="decimal" placeholder={kind==="crypto"?"120":"21150"} required/></div>
        <div><label className={label} htmlFor="asset-fee">Phí giao dịch ({kind==="crypto"?"USDT":"VND"})</label><input id="asset-fee" className={inp} name="fee" inputMode="decimal" defaultValue="0" required/></div>
        <div><label className={label} htmlFor="asset-price">Giá hiện tại thủ công/dự phòng ({kind==="crypto"?"USDT":"VND"})</label><input id="asset-price" className={inp} name="manual_price" inputMode="decimal" placeholder="Có thể để trống nếu dùng giá từ nguồn"/></div>
        <p className="sm:col-span-2 text-xs leading-5 text-[var(--muted-foreground)]">Giá mua dùng để tính giá vốn, không tự coi là giá thị trường. Giá tham chiếu: PNJ (vàng), SSI nếu có API Key (cổ phiếu), Binance Spot (crypto). Không kết nối ví giao dịch hoặc trừ tiền tài khoản hiện có.</p>
        <div className="sm:col-span-2"><Submit><Plus className="size-4"/>Lưu tài sản</Submit></div>
      </form>
    </section>}
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black">Danh mục đang sở hữu</h2><div className="flex flex-wrap gap-1">{(["all",...kinds] as const).map(k=><button key={k} type="button" onClick={()=>setFilter(k)} aria-pressed={filter===k} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter===k?"bg-[var(--primary)] text-white":"bg-[var(--muted)]"}`}>{k==="all"?"Tất cả":kindNames[k]}</button>)}</div></div>
      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-[var(--muted)] p-2 text-xs"><span>Hiển thị khối lượng vàng</span><button type="button" onClick={()=>setGoldMode(m=>m==="chi"?"detail":"chi")} className={secondary}>{goldMode==="chi"?"Đổi sang cây – chỉ – phân":"Đổi sang dạng chỉ"}</button></div>
      {shown.length===0?<p className="py-12 text-center text-sm text-[var(--muted-foreground)]">Chưa có tài sản thuộc nhóm này.</p>:<div className="mt-4 space-y-3">{shown.map(p=>{
        const Icon=kindIcons[p.kind];const pnl=p.pnlVnd;const gain=pnl!==null && pnl>=0;
        return <article key={p.id} className="rounded-2xl border border-[var(--border)] p-4">
          <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--muted)]"><Icon className="size-5 text-[var(--primary)]"/></span><div className="min-w-0 flex-1"><p className="font-black">{p.name}{p.kind!=="gold"?` · ${p.symbol}`:""}</p><p className="text-xs text-[var(--muted-foreground)]">{p.kind==="gold"?goldMode==="chi"?`${decimals(p.quantityNumber,1)} chỉ`:goldUnits(p.quantityNumber):`${decimals(p.quantityNumber,12)} ${p.kind==="stock"?"CP":p.symbol}`} · Giá vốn {decimals(p.quantityNumber? p.costNumber/p.quantityNumber:0,8)} {p.quote_currency}/{p.kind==="gold"?"chỉ":"đơn vị"}</p></div><div className="min-w-0 text-right"><p className="text-sm font-black tabular-nums">{p.valueVnd===null?"Chưa có giá":money(p.valueVnd)}</p>{pnl!==null?<p className={`text-xs font-bold ${gain?"text-[var(--fin-income)]":"text-[var(--fin-expense)]"}`}>{pnl>0?"+":""}{money(pnl)} {p.costVnd&&p.costVnd>0?percent(pnl/p.costVnd*100):""}</p>:null}</div></div>
          <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted-foreground)]"><span>Giá: {p.quote?`${decimals(p.quote.price,8)} ${p.quote_currency}`:"Chưa có giá hợp lệ"} · {p.quote?.source??"Chưa có nguồn"}</span><span>{p.quote?.at?new Date(p.quote.at).toLocaleString("vi-VN"):""}</span></div>
          <details className="group mt-3"><summary className="flex cursor-pointer items-center justify-between rounded-xl bg-[var(--muted)] px-3 py-2.5 text-xs font-bold">Quản lý · Mua / Bán / Định giá <ChevronDown className="size-4 transition group-open:rotate-180"/></summary>
            <div className="mt-3 space-y-4"><form action={portfolioTrade} className="grid grid-cols-2 gap-2 sm:grid-cols-4"><input type="hidden" name="position_id" value={p.id}/>
              <div><label className={label}>Giao dịch</label><select className={inp} name="side"><option value="buy">Mua thêm</option><option value="sell">Bán bớt</option></select></div>
              <div><label className={label}>Số lượng</label><input className={inp} name="quantity" required inputMode="decimal" placeholder="1"/></div>
              <div><label className={label}>Giá / đơn vị ({p.quote_currency})</label><input className={inp} name="unit_price" required inputMode="decimal" placeholder="0"/></div>
              <div><label className={label}>Phí ({p.quote_currency})</label><input className={inp} name="fee" required defaultValue="0" inputMode="decimal"/></div>
              <div className="col-span-2 sm:col-span-4"><Submit><RefreshCw className="size-4"/>Ghi nhận giao dịch</Submit></div></form>
              <form action={updatePortfolioPosition} className="grid grid-cols-2 gap-2 sm:grid-cols-3"><input type="hidden" name="position_id" value={p.id}/><input type="hidden" name="archived" value="0"/>
                <div><label className={label}>Nguồn giá</label><select name="provider" className={inp} defaultValue={p.provider}>{(p.kind==="gold"?["pnj","manual"]:p.kind==="stock"?["ssi","manual"]:["binance","manual"]).map(v=><option key={v} value={v}>{v==="pnj"?"PNJ (tham khảo)":v==="ssi"?"SSI (cần API Key)":v==="binance"?"Binance Spot":"Thủ công"}</option>)}</select></div>
                <div><label className={label}>Giá thủ công/dự phòng</label><input name="manual_price" className={inp} inputMode="decimal" defaultValue={p.manual_price??""} placeholder="Bỏ trống nếu không có"/></div>
                <div className="self-end"><Submit><Save className="size-4"/>Cập nhật giá</Submit></div>
              </form>
              <form action={updatePortfolioPosition} onSubmit={event=>{if(!window.confirm("Ẩn tài sản khỏi danh mục? Dữ liệu giao dịch được giữ lại.")) event.preventDefault();}}>
                <input type="hidden" name="position_id" value={p.id}/><input type="hidden" name="provider" value={p.provider}/><input type="hidden" name="manual_price" value={p.manual_price??""}/><input type="hidden" name="archived" value="1"/>
                <button type="submit" className="text-xs font-semibold text-[var(--fin-expense)] underline">Lưu trữ tài sản</button>
              </form>
            </div>
          </details>
        </article>;
      })}</div>}
    </section>
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5"><h2 className="text-lg font-black">Tỷ giá và lịch sử</h2>
      <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">Crypto được báo giá USDT. Finzaro ưu tiên tỷ giá USDT/VND từ CoinGecko khi truy cập được; nếu không, dùng tỷ giá thủ công do anh nhập. Không mặc định USDT = USD. Lãi/lỗ quy đổi VND dùng tỷ giá hiện tại cho cả giá trị và giá vốn, không phản ánh lãi/lỗ tỷ giá lịch sử.</p>
      <p className="mt-2 text-xs font-semibold">Tỷ giá đang sử dụng: {fx ? `${decimals(fx,2)} VND/USDT · ${fxSource}` : "Chưa có tỷ giá"}</p>
      <form action={savePortfolioFx} className="mt-3 flex flex-wrap items-end gap-2"><div className="min-w-0 flex-1"><label className={label}>1 USDT = bao nhiêu VND? (thủ công)</label><input className={inp} inputMode="decimal" name="usdt_vnd" defaultValue={manualFx??""} placeholder="Nhập tỷ giá hiện tại" required/></div><Submit><Save className="size-4"/>Lưu tỷ giá</Submit></form>
      <div className="mt-5 border-t border-[var(--border)] pt-4"><h3 className="flex items-center gap-2 text-sm font-bold"><History className="size-4"/>Ảnh chụp tài sản đã lưu</h3>
      {snapshots.length>=2&&(()=>{
        const chronological=snapshots.slice(0,30).reverse();
        const amounts=chronological.map(s=>Number(s.estimated_value_vnd));
        const min=Math.min(...amounts);const max=Math.max(...amounts);
        const points=amounts.map((v,i)=>`${Math.round(i/Math.max(chronological.length-1,1)*320)},${Math.round(98-(v-min)/Math.max(max-min,1)*90)}`).join(" ");
        return <svg role="img" aria-label={`Xu hướng giá trị danh mục từ ${chronological[0].snapshot_date} đến ${chronological[chronological.length-1].snapshot_date}`} viewBox="0 0 320 105" className="mt-3 h-32 w-full rounded-xl bg-[var(--muted)] p-2"><polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/></svg>;
      })()}
      {snapshots.length===0?<p className="mt-2 text-xs text-[var(--muted-foreground)]">Chưa có dữ liệu lịch sử. Nhấn “Lưu thống kê hôm nay” khi tất cả giá đã hợp lệ.</p>:<div className="mt-3 space-y-2">{snapshots.slice(0,12).map(s=><div key={s.snapshot_date} className="flex justify-between text-xs"><span>{s.snapshot_date.split("-").reverse().join("/")}</span><strong>{money(Number(s.estimated_value_vnd))}</strong></div>)}</div>}</div>
      {positions.some(p=>p.archived)&&<details className="mt-4 rounded-xl border border-[var(--border)] p-3"><summary className="cursor-pointer text-sm font-bold">Tài sản đã lưu trữ ({positions.filter(p=>p.archived).length})</summary><div className="mt-3 space-y-2">{positions.filter(p=>p.archived).map(p=><form key={p.id} action={updatePortfolioPosition} className="flex items-center justify-between gap-2 text-xs"><span>{p.name} · {p.symbol}</span><input type="hidden" name="position_id" value={p.id}/><input type="hidden" name="provider" value={p.provider}/><input type="hidden" name="manual_price" value={p.manual_price??""}/><input type="hidden" name="archived" value="0"/><button className={secondary} type="submit">Khôi phục</button></form>)}</div></details>}
      <div className="mt-5 border-t border-[var(--border)] pt-4"><h3 className="text-sm font-bold">Giao dịch mua/bán gần đây</h3>{history.length===0?<p className="mt-2 text-xs text-[var(--muted-foreground)]">Chưa có giao dịch.</p>:<div className="mt-3 space-y-2">{history.slice(0,12).map(t=>{const owner=positions.find(p=>p.id===t.position_id);return <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--muted)] px-3 py-2 text-xs"><span className="flex items-center gap-1">{t.side==="buy"?<ArrowDown className="size-3 text-[var(--fin-income)]"/>:<ArrowUp className="size-3 text-[var(--fin-expense)]"/>}<strong>{t.side==="buy"?"Mua":"Bán"} {owner?.symbol??"Tài sản"}</strong> · {decimals(Number(t.quantity),12)} × {decimals(Number(t.unit_price),8)} {owner?.quote_currency??""}</span><span className="text-[var(--muted-foreground)]">{new Date(t.traded_at).toLocaleDateString("vi-VN")}{t.realized_gain!==null?` · Đã thực hiện: ${decimals(Number(t.realized_gain),2)}`:""}</span></div>;})}</div>}</div>
    </section>
    <p className="text-xs leading-5 text-[var(--muted-foreground)]"><Wallet className="mr-1 inline size-3"/>Danh mục đầu tư được quản lý độc lập với Thu/Chi sinh hoạt. App không tự trừ tiền từ tài khoản/ví khi ghi mua tài sản. Định giá thị trường mang tính tham khảo; giá thiếu hoặc lỗi API được đánh dấu, không tự gán 0.</p>
  </div>;
}
