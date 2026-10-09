import { Activity, ArrowDownRight, ArrowUpRight, Building2, Car, Coins, Landmark, TrendingUp } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { CategoryIconPicker } from "@/components/category-icon-picker";
import { InstantReveal } from "@/components/instant-reveal";
import { MobileDateInput } from "@/components/mobile-date-input";
import { MoneyCalculatorInput } from "@/components/money-calculator-input";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StockMarketSync } from "@/components/stock-market-sync";
import { Card, CardContent } from "@/components/ui/card";
import { minorToMajorInput } from "@/features/accounts/money";
import { createInvestmentAssetAction, setInvestmentAssetArchivedAction, updateInvestmentAssetAction } from "@/features/assets/actions";
import { ASSET_TYPE_LABELS, investmentAssetSummary, investmentAssetViews, loadInvestmentAssets, type InvestmentAssetView } from "@/features/assets/data";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { todayInTimeZone } from "@/features/recurring/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đầu tư & tài sản" };
type SearchParams = Promise<{ show?: string; error?: string; message?: string }>;

const typeIcon = { gold: Coins, stock: TrendingUp, fund: TrendingUp, real_estate: Building2, vehicle: Car, business: Landmark, collectible: Coins, other: Coins } as const;

function AssetForm({ currencies, accounts, today, editing }: { currencies: Array<{ code: string; name: string; decimal_digits: number }>; accounts: Array<{ id: string; name: string; currency_code: string; is_archived: boolean }>; today: string; editing?: InvestmentAssetView }) {
  const currencyCode = editing?.currency_code ?? currencies[0]?.code ?? "VND";
  const digits = currencies.find((currency) => currency.code === currencyCode)?.decimal_digits ?? 0;
  return <Card className="border-violet-500/25 shadow-2xl"><CardContent className="p-5 sm:p-6">
    <div><p className="text-xs font-black uppercase tracking-[.14em] text-violet-600">Investment & Asset Tracking</p><h2 className="mt-1 text-lg font-black">{editing ? `Cập nhật ${editing.name}` : "Thêm tài sản"}</h2><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Với cổ phiếu Việt Nam, có thể nhập mã + giá mua bình quân + khối lượng và bật SSI Market Data để Finzaro tự cập nhật giá trị thị trường.</p></div>
    <form action={editing ? updateInvestmentAssetAction : createInvestmentAssetAction} className="mt-5 grid gap-4 md:grid-cols-2">
      {editing && <input type="hidden" name="asset_id" value={editing.id} />}
      <label className="md:col-span-2"><span className="field-label">Tên tài sản</span><input name="name" defaultValue={editing?.name ?? ""} required maxLength={120} className="fin-input" placeholder="VD: Vàng SJC, FPT, Căn hộ..." /></label>
      <label><span className="field-label">Loại tài sản</span><select name="asset_type" defaultValue={editing?.asset_type ?? "gold"} className="fin-input">{Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span className="field-label">Tiền tệ</span><select name="currency_code" defaultValue={currencyCode} disabled={Boolean(editing)} className="fin-input">{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} · {currency.name}</option>)}</select>{editing && <input type="hidden" name="currency_code" value={currencyCode} />}</label>

      <div className="md:col-span-2 rounded-2xl border border-sky-500/20 bg-sky-500/[.04] p-4">
        <div className="flex items-center gap-2"><Activity className="size-4 text-sky-600" /><p className="text-xs font-black uppercase tracking-[.12em] text-sky-600">Cổ phiếu & SSI Market Data</p></div>
        <p className="mt-1.5 text-[11px] leading-4 text-[var(--muted-foreground)]">Các trường này chỉ dùng khi Loại tài sản = Cổ phiếu. Giá mua bình quân × khối lượng sẽ trở thành Cost Basis. Tự động cập nhật giá chỉ hỗ trợ mã Việt Nam bằng VND.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label><span className="field-label">Mã chứng khoán</span><input name="ticker_symbol" defaultValue={editing?.ticker_symbol ?? ""} maxLength={20} className="fin-input uppercase" placeholder="FPT, SSI, VNM" /></label>
          <label><span className="field-label">Sàn</span><select name="exchange" defaultValue={editing?.exchange ?? "HOSE"} className="fin-input"><option value="HOSE">HOSE</option><option value="HNX">HNX</option><option value="UPCOM">UPCOM</option><option value="OTHER">Khác</option></select></label>
          <label><span className="field-label">Khối lượng</span><input name="quantity" inputMode="decimal" defaultValue={editing?.quantity ?? ""} className="fin-input" placeholder="VD: 1000" /></label>
          <label><span className="field-label">Giá mua bình quân</span><MoneyCalculatorInput name="average_buy_price" defaultValue={editing?.average_buy_price_minor !== null && editing?.average_buy_price_minor !== undefined ? minorToMajorInput(editing.average_buy_price_minor, digits) : ""} decimalDigits={digits} currencyCode={currencyCode} allowEmpty /></label>
        </div>
        <label className="mt-3 flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"><input type="checkbox" name="auto_price_enabled" defaultChecked={editing?.auto_price_enabled ?? false} className="mt-0.5 size-4 accent-[var(--primary)]" /><span><span className="block text-xs font-black">Tự động cập nhật giá qua SSI FastConnect</span><span className="mt-1 block text-[10px] leading-4 text-[var(--muted-foreground)]">Finzaro lấy Market Data qua server; API Key/Secret không được gửi xuống trình duyệt. Nếu chưa cấu hình SSI, vẫn có thể nhập Current Value thủ công.</span></span></label>
      </div>

      <label><span className="field-label">Tổ chức / Broker</span><input name="institution_name" maxLength={160} defaultValue={editing?.institution_name ?? ""} className="fin-input" placeholder="VD: SSI, VCB, SJC..." /></label>
      <label><span className="field-label">Giá vốn tổng</span><MoneyCalculatorInput name="cost_basis" defaultValue={editing ? minorToMajorInput(editing.cost_basis_minor, digits) : "0"} decimalDigits={digits} currencyCode={currencyCode} required /></label>
      <label><span className="field-label">Giá trị hiện tại</span><MoneyCalculatorInput name="current_value" defaultValue={editing ? minorToMajorInput(editing.current_value_minor, digits) : "0"} decimalDigits={digits} currencyCode={currencyCode} required /></label>
      <label><span className="field-label">Ngày mua</span><MobileDateInput name="purchase_date" defaultValue={editing?.purchase_date ?? ""} ariaLabel="Ngày mua tài sản" /></label>
      <label><span className="field-label">Ngày định giá</span><MobileDateInput name="valuation_date" defaultValue={editing?.valuation_date ?? today} ariaLabel="Ngày định giá tài sản" /></label>
      <label className="md:col-span-2"><span className="field-label">Tài khoản liên kết (tùy chọn)</span><select name="linked_account_id" defaultValue={editing?.linked_account_id ?? ""} className="fin-input"><option value="">Không liên kết</option>{accounts.filter((account) => !account.is_archived).map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select><span className="mt-1.5 block text-[11px] text-[var(--muted-foreground)]">Chỉ dùng làm tham chiếu nguồn/broker; phải cùng tiền tệ với tài sản và không tự trừ tiền khỏi tài khoản.</span></label>
      <div className="md:col-span-2"><span className="field-label">Icon & màu</span><CategoryIconPicker defaultValue={editing?.icon_name ?? "Coins"} defaultColor={editing?.icon_color ?? "#7c3aed"} /></div>
      <label className="md:col-span-2"><span className="field-label">Ghi chú</span><textarea name="notes" maxLength={1000} rows={3} defaultValue={editing?.notes ?? ""} className="fin-textarea" /></label>
      <div className="flex justify-end gap-2 md:col-span-2"><button type="button" data-instant-close className="fin-secondary-btn">Hủy</button><PendingSubmitButton idleLabel={editing ? "Cập nhật tài sản" : "Lưu tài sản"} pendingLabel="Đang lưu..." className="fin-primary-btn" /></div>
    </form>
  </CardContent></Card>;
}

export default async function AssetsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const showArchived = params.show === "archived";
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code,timezone").eq("id", userId).maybeSingle();
  const defaultCurrency = preferences?.currency_code ?? "VND";
  const today = todayInTimeZone(preferences?.timezone ?? "Asia/Ho_Chi_Minh");
  const data = await loadInvestmentAssets(supabase, userId, showArchived);
  const rows = investmentAssetViews(data.assets, data.valuations, data.accounts);
  const summary = investmentAssetSummary(rows, defaultCurrency);
  const digits = data.currencies.find((currency) => currency.code === defaultCurrency)?.decimal_digits ?? 0;
  const otherCurrencyCount = rows.filter((row) => !row.is_archived && row.currency_code !== defaultCurrency).length;
  const autoStockCount = rows.filter((row) => !row.is_archived && row.asset_type === "stock" && row.auto_price_enabled && row.market_data_provider === "ssi" && row.ticker_symbol).length;

  return <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-violet-600">Wealth · Assets</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Đầu tư & tài sản</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">Theo dõi tài sản và danh mục cổ phiếu theo giá mua thực tế. V0.7.0 có thể lấy giá thị trường SSI tự động để tính Market Value và lãi/lỗ chưa thực hiện.</p></div><div className="flex gap-2"><a href={showArchived ? "/assets" : "/assets?show=archived"} className="fin-secondary-btn">{showArchived ? "Đang lưu trữ" : "Xem lưu trữ"}</a><InstantReveal label="Thêm tài sản"><AssetForm currencies={data.currencies} accounts={data.accounts} today={today} /></InstantReveal></div></div>
    <AuthMessage error={params.error} message={params.message} />
    {!showArchived && <div className="mt-4"><StockMarketSync enabledCount={autoStockCount} /></div>}

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardContent className="p-4"><Coins className="size-5 text-violet-600" /><p className="mt-3 fin-stat-label">Giá trị hiện tại · {defaultCurrency}</p><p className="mt-1 text-xl font-black">{formatMinorMoney(summary.currentValue, defaultCurrency, digits)}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{summary.count} tài sản đang hoạt động</p></CardContent></Card>
      <Card><CardContent className="p-4"><Landmark className="size-5 text-sky-600" /><p className="mt-3 fin-stat-label">Tổng giá vốn</p><p className="mt-1 text-xl font-black">{formatMinorMoney(summary.costBasis, defaultCurrency, digits)}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Cổ phiếu có thể tính từ giá mua bình quân × KL</p></CardContent></Card>
      <Card><CardContent className="p-4">{summary.gainLoss >= 0 ? <ArrowUpRight className="size-5 text-emerald-600" /> : <ArrowDownRight className="size-5 text-rose-500" />}<p className="mt-3 fin-stat-label">Lãi / lỗ chưa thực hiện</p><p className={`mt-1 text-xl font-black ${summary.gainLoss >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{formatMinorMoney(summary.gainLoss, defaultCurrency, digits)}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{summary.returnPercent === null ? "Chưa có cost basis" : `${summary.returnPercent >= 0 ? "+" : ""}${summary.returnPercent}%`}</p></CardContent></Card>
      <Card><CardContent className="p-4"><TrendingUp className="size-5 text-amber-500" /><p className="mt-3 fin-stat-label">Market Data</p><p className="mt-1 text-xl font-black">{autoStockCount} mã SSI</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{otherCurrencyCount ? `+ ${otherCurrencyCount} tài sản ở currency khác` : "Auto refresh khi trang mở"}</p></CardContent></Card>
    </div>

    {summary.byType.length > 0 && <Card className="mt-4"><CardContent className="p-5"><h2 className="text-sm font-black">Phân bổ tài sản · {defaultCurrency}</h2><div className="mt-4 space-y-3">{summary.byType.map((item) => { const pct = summary.currentValue > 0 ? Math.round(item.value / summary.currentValue * 1000) / 10 : 0; return <div key={item.type}><div className="flex justify-between gap-3 text-xs"><span className="font-bold">{item.label}</span><span className="font-black">{formatMinorMoney(item.value, defaultCurrency, digits)} · {pct}%</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(2, pct)}%` }} /></div></div>; })}</div></CardContent></Card>}

    {rows.length === 0 ? <Card className="mt-5"><CardContent className="py-14 text-center"><Coins className="mx-auto size-8 text-violet-600" /><h2 className="mt-4 text-lg font-black">Chưa có tài sản đầu tư</h2><p className="mx-auto mt-2 max-w-lg text-sm text-[var(--muted-foreground)]">Thêm cổ phiếu, vàng, quỹ, bất động sản hoặc tài sản khác để Net Worth phản ánh đầy đủ hơn.</p></CardContent></Card> : <div className="mt-5 grid gap-4 xl:grid-cols-2">{rows.map((asset) => {
      const rowDigits = data.currencies.find((currency) => currency.code === asset.currency_code)?.decimal_digits ?? 0;
      const Icon = typeIcon[asset.asset_type] ?? Coins;
      const buyPrice = asset.average_buy_price_minor;
      return <Card key={asset.id} className={asset.is_archived ? "opacity-70" : undefined}><CardContent className="p-5 sm:p-6"><div className="flex items-start gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--sidebar-accent)]" style={{ color: iconColorValue(asset.icon_color) }}><CategoryIcon name={asset.icon_name} className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-black">{asset.name}</h2><p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]"><Icon className="size-3.5" /> {asset.ticker_symbol ? `${asset.ticker_symbol}${asset.exchange ? ` · ${asset.exchange}` : ""}` : ASSET_TYPE_LABELS[asset.asset_type]}{asset.institution_name ? ` · ${asset.institution_name}` : ""}</p></div><div className="flex gap-1.5"><span className="fin-badge">{asset.currency_code}</span>{asset.auto_price_enabled && <span className="fin-badge text-sky-600">SSI auto</span>}</div></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[var(--muted)] p-3"><p className="text-[10px] font-black uppercase text-[var(--muted-foreground)]">Giá trị</p><p className="mt-1 text-base font-black">{formatMinorMoney(asset.current_value_minor, asset.currency_code, rowDigits)}</p>{asset.market_price_minor !== null && <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">Giá TT {formatMinorMoney(asset.market_price_minor, asset.currency_code, rowDigits)} / cp</p>}</div><div className="rounded-xl bg-[var(--muted)] p-3"><p className="text-[10px] font-black uppercase text-[var(--muted-foreground)]">Lãi / lỗ</p><p className={`mt-1 text-base font-black ${asset.gain_loss_minor >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{formatMinorMoney(asset.gain_loss_minor, asset.currency_code, rowDigits)}{asset.return_percent !== null ? ` · ${asset.return_percent}%` : ""}</p>{buyPrice !== null && <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">Giá mua TB {formatMinorMoney(buyPrice, asset.currency_code, rowDigits)}</p>}</div></div><p className="mt-3 text-[11px] text-[var(--muted-foreground)]">Định giá {asset.valuation_date.split("-").reverse().join("/")}{asset.quantity !== null ? ` · KL ${asset.quantity}` : ""}{asset.market_price_updated_at ? ` · SSI ${new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", timeZone: preferences?.timezone ?? "Asia/Ho_Chi_Minh" }).format(new Date(asset.market_price_updated_at))}` : ""}</p></div></div><div className="mt-4 flex flex-wrap gap-2">{!asset.is_archived && <><InstantReveal label="Cập nhật" icon={false} className="h-9 bg-transparent px-3 text-xs text-[var(--foreground)] ring-1 ring-[var(--border)]"><AssetForm currencies={data.currencies} accounts={data.accounts} today={today} editing={asset} /></InstantReveal><form action={setInvestmentAssetArchivedAction}><input type="hidden" name="asset_id" value={asset.id} /><input type="hidden" name="archived" value="true" /><PendingSubmitButton idleLabel="Lưu trữ" pendingLabel="Đang lưu..." className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold" /></form></>}{asset.is_archived && <form action={setInvestmentAssetArchivedAction}><input type="hidden" name="asset_id" value={asset.id} /><input type="hidden" name="archived" value="false" /><PendingSubmitButton idleLabel="Khôi phục" pendingLabel="Đang khôi phục..." className="fin-primary-btn h-9" /></form>}</div>{asset.valuations.length > 1 && <div className="mt-4 border-t border-[var(--border)] pt-3"><p className="text-[10px] font-black uppercase text-[var(--muted-foreground)]">Định giá gần đây</p><div className="mt-2 flex gap-2 overflow-x-auto">{asset.valuations.slice(0, 4).map((valuation) => <div key={valuation.id} className="min-w-[135px] rounded-xl bg-[var(--muted)] p-2.5"><p className="text-[10px] text-[var(--muted-foreground)]">{valuation.valuation_date.split("-").reverse().join("/")}</p><p className="mt-1 text-xs font-black">{formatMinorMoney(valuation.value_minor, asset.currency_code, rowDigits)}</p></div>)}</div></div>}</CardContent></Card>;
    })}</div>}

    <Card className="mt-5 border-violet-500/20"><CardContent className="p-5 text-sm leading-6 text-[var(--muted-foreground)]"><strong className="text-[var(--foreground)]">Nguyên tắc:</strong> Asset Tracking là valuation layer. SSI Market Data chỉ cập nhật giá thị trường/current value của mã đã bật auto; Finzaro không đặt lệnh và không tự trừ Account khi tạo asset. Khi mua/bán thực tế, Transaction Ledger vẫn là source of truth cho dòng tiền.</CardContent></Card>
  </div>;
}
