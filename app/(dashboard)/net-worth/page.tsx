import Link from "next/link";
import { ArrowRight, Banknote, CircleDollarSign, CreditCard, Landmark, RefreshCw, Scale, ShieldCheck, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { saveNetWorthSnapshotAction } from "@/features/net-worth/actions";
import { loadNetWorthData, positionForCurrency } from "@/features/net-worth/data";
import { todayInTimeZone } from "@/features/recurring/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const metadata = { title: "Tài sản ròng" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ currency?: string; error?: string; message?: string }>;

function compactDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function ratioTone(value: number, thresholds: [number, number], invert = false) {
  const [good, attention] = thresholds;
  if (invert) return value <= good ? "text-emerald-600" : value <= attention ? "text-amber-500" : "text-rose-500";
  return value >= good ? "text-emerald-600" : value >= attention ? "text-amber-500" : "text-rose-500";
}

export default async function NetWorthPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const defaultCurrency = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const today = todayInTimeZone(timeZone);
  const data = await loadNetWorthData(supabase, userId, today);
  const availableCodes = new Set(data.summaries.map((row) => row.currency_code));
  availableCodes.add(defaultCurrency);
  const selectedCurrency = params.currency && availableCodes.has(params.currency) ? params.currency : defaultCurrency;
  const summary = positionForCurrency(data.summaries, selectedCurrency);
  const currency = data.currencies.find((row) => row.code === selectedCurrency) ?? { code: selectedCurrency, decimal_digits: 0, name: selectedCurrency, symbol: selectedCurrency };
  const digits = currency.decimal_digits;
  const snapshots = data.snapshots.filter((row) => row.currency_code === selectedCurrency).slice(-12);
  const previousSnapshot = snapshots.at(-2) ?? null;
  const snapshotDelta = previousSnapshot ? summary.net_worth_minor - previousSnapshot.net_worth_minor : null;
  const snapshotDeltaPercent = previousSnapshot && previousSnapshot.net_worth_minor !== 0 ? Math.round((snapshotDelta! / Math.abs(previousSnapshot.net_worth_minor)) * 1000) / 10 : null;
  const maxTrend = Math.max(1, ...snapshots.map((row) => Math.abs(row.net_worth_minor)), Math.abs(summary.net_worth_minor));
  const positiveNetWorth = summary.net_worth_minor >= 0;

  const assetRows = [
    { label: "Tài khoản", value: summary.account_assets_minor, icon: WalletCards, href: "/accounts" },
    { label: "Tiền gửi", value: summary.deposit_assets_minor, icon: Landmark, href: "/deposits" }
  ];
  const liabilityRows = [
    { label: "Khoản vay", value: summary.loan_liabilities_minor, icon: CircleDollarSign, href: "/loans" },
    { label: "Thẻ tín dụng", value: summary.credit_card_liabilities_minor, icon: CreditCard, href: "/credit-cards" }
  ];
  const accountBreakdown = [
    { label: "Ngân hàng", value: summary.bank_minor },
    { label: "Tiết kiệm", value: summary.savings_minor },
    { label: "Tiền mặt", value: summary.cash_minor },
    { label: "Ví điện tử", value: summary.ewallet_minor }
  ].filter((row) => row.value !== 0);

  return (
    <div className="mx-auto max-w-[1500px] min-w-0 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">Financial Position · Balance Sheet</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Tài sản ròng</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">Tổng hợp tài sản thực và nghĩa vụ nợ thành một bức tranh tài chính. Finzaro không quy đổi FX tự động để tránh tạo số liệu tài sản ròng sai.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form method="get" className="flex gap-2"><select name="currency" defaultValue={selectedCurrency} className="fin-input min-w-28" aria-label="Tiền tệ tài sản ròng">{Array.from(availableCodes).sort().map((code) => <option key={code} value={code}>{code}</option>)}</select><button type="submit" className="fin-secondary-btn px-3">Áp dụng</button></form>
          <form action={saveNetWorthSnapshotAction}><input type="hidden" name="currency_code" value={selectedCurrency} /><PendingSubmitButton idleLabel="Lưu snapshot" pendingLabel="Đang lưu..." className="fin-primary-btn" /></form>
        </div>
      </div>

      <AuthMessage error={params.error} message={params.message} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="fin-card border-emerald-500/20"><CardContent><Scale className="size-5 text-[var(--primary)]" /><p className="fin-stat-label">Net Worth · {selectedCurrency}</p><p className={`fin-stat-value ${positiveNetWorth ? "text-emerald-600" : "text-rose-500"}`}>{formatMinorMoney(summary.net_worth_minor, selectedCurrency, digits)}</p><p className="fin-stat-help">Tài sản − Nợ phải trả</p></CardContent></Card>
        <Card className="fin-card"><CardContent><TrendingUp className="size-5 text-emerald-600" /><p className="fin-stat-label">Tổng tài sản</p><p className="fin-stat-value">{formatMinorMoney(summary.total_assets_minor, selectedCurrency, digits)}</p><p className="fin-stat-help">Account + principal tiền gửi</p></CardContent></Card>
        <Card className="fin-card"><CardContent><TrendingDown className="size-5 text-rose-500" /><p className="fin-stat-label">Tổng nghĩa vụ nợ</p><p className="fin-stat-value">{formatMinorMoney(summary.total_liabilities_minor, selectedCurrency, digits)}</p><p className="fin-stat-help">Loan + Credit Card balance</p></CardContent></Card>
        <Card className="fin-card"><CardContent><Banknote className="size-5 text-sky-600" /><p className="fin-stat-label">Tài sản thanh khoản</p><p className="fin-stat-value">{formatMinorMoney(summary.liquid_assets_minor, selectedCurrency, digits)}</p><p className="fin-stat-help">Số dư Account có thể truy cập</p></CardContent></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="fin-card"><CardContent><p className="text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Debt / Assets</p><div className="mt-3 flex items-end justify-between gap-3"><p className={`text-3xl font-black ${ratioTone(summary.debt_to_asset_percent, [35, 60], true)}`}>{summary.debt_to_asset_percent}%</p><ShieldCheck className="size-6 text-[var(--muted-foreground)]" /></div><p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">Tỷ lệ nghĩa vụ nợ trên tổng tài sản. Thấp hơn thường tạo dư địa tài chính tốt hơn.</p></CardContent></Card>
        <Card className="fin-card"><CardContent><p className="text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Liquidity coverage</p><div className="mt-3 flex items-end justify-between gap-3"><p className={`text-3xl font-black ${ratioTone(summary.liquidity_coverage_percent, [100, 50])}`}>{summary.liquidity_coverage_percent >= 999 ? "999+" : summary.liquidity_coverage_percent}%</p><WalletCards className="size-6 text-[var(--muted-foreground)]" /></div><p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">Tài sản thanh khoản so với tổng nợ. Chỉ là chỉ báo quản lý, không phải tư vấn tài chính.</p></CardContent></Card>
        <Card className="fin-card"><CardContent><p className="text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">So với snapshot trước</p><div className="mt-3 flex items-end justify-between gap-3"><p className={`text-3xl font-black ${snapshotDelta === null || snapshotDelta >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{snapshotDeltaPercent === null ? "—" : `${snapshotDeltaPercent > 0 ? "+" : ""}${snapshotDeltaPercent}%`}</p><RefreshCw className="size-6 text-[var(--muted-foreground)]" /></div><p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{previousSnapshot ? `${compactDate(previousSnapshot.snapshot_date)} → hôm nay` : "Lưu ít nhất hai snapshot để thấy xu hướng."}</p></CardContent></Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card className="fin-card"><CardHeader><div><h2 className="font-black">Tài sản</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Nguồn tạo giá trị tài chính hiện tại · {selectedCurrency}</p></div></CardHeader><CardContent className="space-y-3">{assetRows.map((row) => { const Icon = row.icon; const percent = summary.total_assets_minor > 0 ? Math.round((row.value / summary.total_assets_minor) * 1000) / 10 : 0; return <Link key={row.label} href={row.href} className="block rounded-2xl border border-[var(--border)] p-4 transition hover:bg-[var(--muted)]"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600"><Icon className="size-4.5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-black">{row.label}</p><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{percent}% tổng tài sản</p></div><p className="text-sm font-black">{formatMinorMoney(row.value, selectedCurrency, digits)}</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, percent)}%` }} /></div></Link>; })}</CardContent></Card>
        <Card className="fin-card"><CardHeader><div><h2 className="font-black">Nợ phải trả</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Dư nợ hiện tại cần được thanh toán</p></div></CardHeader><CardContent className="space-y-3">{liabilityRows.map((row) => { const Icon = row.icon; const percent = summary.total_liabilities_minor > 0 ? Math.round((row.value / summary.total_liabilities_minor) * 1000) / 10 : 0; return <Link key={row.label} href={row.href} className="block rounded-2xl border border-[var(--border)] p-4 transition hover:bg-[var(--muted)]"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-rose-500/10 text-rose-500"><Icon className="size-4.5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-black">{row.label}</p><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{percent}% tổng nghĩa vụ nợ</p></div><p className="text-sm font-black">{formatMinorMoney(row.value, selectedCurrency, digits)}</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(100, percent)}%` }} /></div></Link>; })}</CardContent></Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="fin-card"><CardHeader><div><h2 className="font-black">Xu hướng tài sản ròng</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">12 snapshot gần nhất · lưu theo ngày</p></div></CardHeader><CardContent>{snapshots.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center"><p className="text-sm font-black">Chưa có snapshot</p><p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">Bấm “Lưu snapshot” để bắt đầu theo dõi Net Worth theo thời gian.</p></div> : <div className="flex min-h-52 items-end gap-2 overflow-x-auto pb-1">{snapshots.map((row) => { const height = Math.max(8, Math.round((Math.abs(row.net_worth_minor) / maxTrend) * 150)); return <div key={row.id} className="flex min-w-11 flex-1 flex-col items-center justify-end gap-2"><span className="max-w-20 truncate text-[9px] font-bold text-[var(--muted-foreground)]">{formatMinorMoney(row.net_worth_minor, selectedCurrency, digits)}</span><div className={`w-full max-w-12 rounded-t-lg ${row.net_worth_minor >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ height: `${height}px` }} /><span className="text-[9px] text-[var(--muted-foreground)]">{row.snapshot_date.slice(5).split("-").reverse().join("/")}</span></div>; })}</div>}</CardContent></Card>
        <Card className="fin-card"><CardHeader><div><h2 className="font-black">Cấu trúc thanh khoản</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Breakdown số dư Account</p></div></CardHeader><CardContent className="space-y-3">{accountBreakdown.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--muted-foreground)]">Chưa có Account bằng {selectedCurrency}.</div> : accountBreakdown.map((row) => { const percent = summary.account_assets_minor > 0 ? Math.round((row.value / summary.account_assets_minor) * 1000) / 10 : 0; return <div key={row.label}><div className="flex justify-between gap-3 text-xs"><span className="font-bold">{row.label}</span><span className="font-black">{formatMinorMoney(row.value, selectedCurrency, digits)} · {percent}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} /></div></div>; })}<div className="mt-4 rounded-xl bg-[var(--muted)] p-3 text-[11px] leading-5 text-[var(--muted-foreground)]"><strong className="text-[var(--foreground)]">Không double-count Savings Goals:</strong> Goal là lớp planning/progress, không phải tài sản độc lập. Tiền gửi được tính theo principal hiện tại; lãi dự kiến chỉ hiển thị riêng và chưa cộng vào Net Worth.</div></CardContent></Card>
      </div>

      <Card className="mt-4 fin-card"><CardContent className="flex flex-wrap items-center gap-4 p-5"><div className="grid size-11 place-items-center rounded-xl bg-[var(--sidebar-accent)] text-[var(--primary)]"><TrendingUp className="size-5" /></div><div className="min-w-[220px] flex-1"><h2 className="font-black">Financial Position coverage</h2><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{summary.active_accounts} account · {summary.active_deposits} tiền gửi · {summary.active_loans} khoản vay · {summary.active_credit_cards} thẻ có dư nợ. Lãi tiền gửi dự kiến {formatMinorMoney(summary.projected_deposit_interest_minor, selectedCurrency, digits)} chưa được ghi nhận vào tài sản ròng.</p></div><Link href="/reports" className="fin-secondary-btn">Mở báo cáo <ArrowRight className="size-3.5" /></Link></CardContent></Card>
    </div>
  );
}
