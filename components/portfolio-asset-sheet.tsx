"use client";

import { useState } from "react";
import { Archive, Bitcoin, Gem, Plus, Save, TrendingUp, X } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { SheetFormActions } from "@/components/sheet-form-actions";
import type { AssetKind, ValuedPosition } from "@/features/portfolio/core";
import { createPortfolioPosition, editPortfolioAsset, updatePortfolioPosition } from "@/features/portfolio/actions";

export type OpeningTrade = {position_id:string;quantity:string;unit_price:string;fee:string;trade_count:number};
export const assetNames: Record<AssetKind,string> = {gold:"Vàng 9999",stock:"Chứng khoán",crypto:"Crypto"};
const types: AssetKind[] = ["gold","stock","crypto"];
const iconOf = {gold:Gem,stock:TrendingUp,crypto:Bitcoin};
const field = "mt-1.5 min-h-12 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm font-semibold outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
const label = "block text-xs font-bold text-[var(--muted-foreground)]";
const num = (value: number | string) => String(value).replace(".",",");

export function PortfolioAssetSheet({open,onClose,asset,opening}:{open:boolean;onClose:()=>void;asset:ValuedPosition|null;opening?:OpeningTrade}) {
  const [kind,setKind] = useState<AssetKind>(asset?.kind??"gold");
  const isEdit = asset !== null;
  const currentKind = asset?.kind??kind;
  const formId = `fin-portfolio-${asset?.id??"new"}`;
  const assetProvider = currentKind==="gold"?[{value:"pnj",label:"PNJ"},{value:"manual",label:"Thủ công"}]:currentKind==="stock"?[{value:"ssi",label:"SSI"},{value:"manual",label:"Thủ công"}]:[{value:"binance",label:"Binance"},{value:"manual",label:"Thủ công"}];
  return <BottomSheet open={open} onClose={onClose} label={isEdit?`Sửa tài sản ${asset.name}`:"Thêm tài sản đầu tư"}
    panelClassName="mx-auto max-w-2xl sm:mb-4 sm:max-h-[calc(100dvh-36px)] sm:rounded-[26px]">
    <div className="px-4 pb-6 pt-2 sm:px-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div><p className="text-[11px] font-black uppercase tracking-[.15em] text-[var(--primary)]">{isEdit?"QUẢN LÝ DANH MỤC":"GHI NHẬN ĐẦU TƯ"}</p>
          <h2 className="mt-1 text-xl font-black">{isEdit?"Sửa thông tin tài sản":"Thêm tài sản mới"}</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{isEdit?"Thay đổi được lưu lại và đối soát giá vốn tự động.":"Chọn loại tài sản, nhập khối lượng và giá mua ban đầu."}</p>
        </div>
        <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)]" aria-label="Đóng"><X className="size-4"/></button>
      </div>
      {!isEdit && <div role="group" aria-label="Loại tài sản" className="mb-5 grid grid-cols-3 gap-2">{types.map(type=>{
        const Icon=iconOf[type];return <button type="button" key={type} onClick={()=>setKind(type)} aria-pressed={kind===type}
          className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 text-xs font-extrabold transition ${kind===type?"border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]":"border-[var(--border)] text-[var(--muted-foreground)]"}`}>
          <Icon className="size-5"/>{assetNames[type]}</button>;
      })}</div>}
      {isEdit && !opening ? <p role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">Không đọc được giao dịch mua ban đầu. Vui lòng kiểm tra migration V4.6.1 trước khi sửa tài sản.</p> :
      <form id={formId} key={`${asset?.id??"create"}-${currentKind}`} action={isEdit?editPortfolioAsset:createPortfolioPosition} className="space-y-5">
        <input type="hidden" name="kind" value={currentKind}/>
        {asset && <input type="hidden" name="position_id" value={asset.id}/>}
        <section className="space-y-3">
          <h3 className="text-sm font-black">01 · Thông tin tài sản</h3>
          {isEdit && <div><label htmlFor="asset-edit-name" className={label}>Tên hiển thị</label><input id="asset-edit-name" name="name" className={field} maxLength={120} required defaultValue={asset.name}/></div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {currentKind === "gold" ? <div><label htmlFor="asset-variant" className={label}>Loại vàng 24K / 9999</label>
              <select id="asset-variant" name="variant" className={field} defaultValue={asset?.variant??"pnj_ring"}>
                <option value="pnj_ring">Nhẫn trơn PNJ 9999</option><option value="sjc_bar">Vàng miếng SJC</option><option value="other_ring">Nhẫn trơn 9999 khác</option>
              </select></div> : <div><label htmlFor="asset-symbol" className={label}>Mã {currentKind==="stock"?"cổ phiếu":"crypto"}</label>
              <input id="asset-symbol" name="symbol" className={`${field} uppercase`} required autoCapitalize="characters" maxLength={15} placeholder={currentKind==="stock"?"MBB":"SOL"} defaultValue={asset?.symbol??""}/></div>}
            {currentKind==="stock" && <div><label htmlFor="asset-exchange" className={label}>Sàn niêm yết</label><select id="asset-exchange" name="exchange" className={field} defaultValue={asset?.exchange??"HOSE"}>
              <option value="HOSE">HOSE</option><option value="HNX">HNX</option><option value="UPCOM">UPCOM</option></select></div>}
          </div>
        </section>
        <section className="space-y-3 border-t border-[var(--border)] pt-4">
          <h3 className="text-sm font-black">02 · {isEdit?"Giao dịch mua ban đầu":"Thông tin mua ban đầu"}</h3>
          {isEdit && <p className="rounded-xl bg-[var(--muted)] px-3 py-2.5 text-xs leading-5 text-[var(--muted-foreground)]">Đây là lần mua đầu tiên, không nhất thiết là số đang nắm giữ. Các lần mua/bán tiếp theo được giữ nguyên và tự tính lại khi lưu.{Number(opening?.trade_count)>1?` Tài sản có ${opening?.trade_count} giao dịch trong lịch sử.`:""}</p>}
          <div><label htmlFor="asset-quantity" className={label}>Số lượng mua ({currentKind==="gold"?"chỉ":currentKind==="stock"?"cổ phiếu":"coin"})</label>
            <input id="asset-quantity" name={isEdit?"initial_quantity":"quantity"} className={field} required inputMode="decimal" placeholder={currentKind==="gold"?"12,3":currentKind==="stock"?"200":"2,5"} defaultValue={opening?num(opening.quantity):""}/>
            {currentKind==="gold"&&<p className="mt-1 text-[11px] text-[var(--muted-foreground)]">12,3 chỉ = 1 cây 2 chỉ 3 phân</p>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label htmlFor="asset-buy" className={label}>Giá mua / {currentKind==="gold"?"chỉ":currentKind==="stock"?"cổ phiếu":"coin"} ({currentKind==="crypto"?"USDT":"VND"})</label>
              <input id="asset-buy" name={isEdit?"initial_buy_price":"buy_price"} className={field} required inputMode="decimal" placeholder={currentKind==="crypto"?"120":"21.150"} defaultValue={opening?num(opening.unit_price):""}/></div>
            <div><label htmlFor="asset-fee" className={label}>Phí mua ban đầu ({currentKind==="crypto"?"USDT":"VND"})</label>
              <input id="asset-fee" name={isEdit?"initial_fee":"fee"} className={field} required inputMode="decimal" defaultValue={opening?num(opening.fee):"0"}/></div>
          </div>
        </section>
        <section className="space-y-3 border-t border-[var(--border)] pt-4">
          <h3 className="text-sm font-black">03 · Nguồn định giá</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {isEdit && <div><label htmlFor="asset-provider" className={label}>Nguồn giá thị trường</label><select id="asset-provider" name="provider" defaultValue={asset.provider} className={field}>
              {assetProvider.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
            </select></div>}
            <div><label htmlFor="asset-manual" className={label}>Giá thủ công / dự phòng ({currentKind==="crypto"?"USDT":"VND"})</label>
              <input id="asset-manual" name="manual_price" inputMode="decimal" className={field} defaultValue={asset?.manual_price?num(asset.manual_price):""} placeholder="Để trống nếu chưa có"/></div>
          </div>
          <p className="text-xs leading-5 text-[var(--muted-foreground)]">Giá mua dùng tính giá vốn, không tự động xem là giá thị trường. Giá thủ công chỉ được dùng khi nguồn giá không khả dụng hoặc được chọn là nguồn chính.</p>
        </section>
        <SheetFormActions className="w-full justify-end border-t border-[var(--border)] bg-[var(--card)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-bold">Hủy</button>
          <button type="submit" form={formId} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-extrabold text-white sm:flex-none">
            {isEdit?<Save className="size-4"/>:<Plus className="size-4"/>}{isEdit?"Lưu thay đổi":"Thêm tài sản"}
          </button>
        </SheetFormActions>
      </form>}
      {asset && <form action={updatePortfolioPosition} onSubmit={event=>{if(!window.confirm("Lưu trữ tài sản? Các giao dịch trước đây được giữ lại."))event.preventDefault();}} className="mt-4 text-right">
        <input type="hidden" name="position_id" value={asset.id}/><input type="hidden" name="provider" value={asset.provider}/><input type="hidden" name="manual_price" value={asset.manual_price??""}/><input type="hidden" name="archived" value="1"/>
        <button type="submit" className="inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-[var(--fin-expense)]"><Archive className="size-3.5"/>Lưu trữ tài sản</button>
      </form>}
    </div>
  </BottomSheet>;
}
