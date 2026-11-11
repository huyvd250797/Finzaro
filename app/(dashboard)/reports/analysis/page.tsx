import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Download, FileSpreadsheet, FileText, Info, TrendingDown, TrendingUp, Wallet, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FinancialTrendExplorer } from "@/components/financial-trend-explorer";
import { FinancialReportFilters } from "@/components/financial-report-filters";
import { ReportDataStatus } from "@/components/report-data-status";
import { ReportNavigation } from "@/components/report-navigation";
import { ReportDonut } from "@/components/report-donut";
import { ReportVisualBoundary } from "@/components/report-visual-boundary";
import { iconColorValue } from "@/features/categories/icons";
import { loadFinancialReport } from "@/features/reports/server-report";
import { formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Phân tích tài chính" };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
function percent(value: number | null, suffix = "%") { return value === null ? "Chưa có kỳ gốc" : `${value > 0 ? "+" : ""}${value.toLocaleString("vi-VN")}${suffix}`; }

export default async function ReportAnalysisPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) as Record<string, string | undefined>;
  const report = await loadFinancialReport(params);
  const { range, previousRange, ledger, currency, digits, filters, comparison, monthly, categories, accounts, movements, insights, query } = report;
  const money = (amount: number) => formatMinorMoney(amount, currency, digits);
  const disabled = ledger.diagnostics.strategy === "empty";
  const exportLink = (format: string) => `/api/reports/export?${query}&format=${format}`;
  const metricCards = [
    { label: "Tổng thu", amount: comparison.current.income, delta: comparison.incomeChange, color: "text-emerald-500", icon: TrendingUp, explanation: "So với kỳ trước" },
    { label: "Tổng chi", amount: comparison.current.expense, delta: comparison.expenseChange, color: "text-rose-500", icon: TrendingDown, explanation: "So với kỳ trước" },
    { label: "Dòng tiền ròng", amount: comparison.current.net, delta: comparison.netChange, color: "text-sky-500", icon: Wallet, explanation: "So với kỳ trước" },
    { label: "Tỷ lệ giữ lại", amount: null, delta: comparison.retainedChange, color: "text-[var(--primary)]", icon: Sparkles, explanation: "Chênh lệch điểm %" }
  ];
  return <div className="fin-page-shell mx-auto max-w-[1200px] space-y-4 px-3 py-4 sm:px-4 md:px-6 lg:px-8 lg:py-7">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">FINZARO / INSIGHTS</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Phân tích tài chính</h1><p className="mt-1 text-xs text-[var(--muted-foreground)]">Dòng tiền thực tế · Theo kỳ, danh mục và tài khoản</p></div>
      <div className="flex flex-wrap gap-2"><Link href={`/reports/statements?${query}`} className="fin-secondary-btn !text-xs"><FileText className="size-4" /> Sổ báo cáo</Link><Link href={exportLink("xlsx")} className="fin-primary-btn !text-xs" aria-disabled={disabled}><FileSpreadsheet className="size-4" /> Excel</Link><Link href={exportLink("csv")} className="fin-secondary-btn !text-xs"><Download className="size-4" /> CSV</Link></div>
    </header>
    <ReportNavigation active="analysis" />
    <ReportDataStatus diagnostics={ledger.diagnostics} />
    {disabled ? <Card><CardContent className="p-6 text-sm text-rose-500">Chưa thể tải dữ liệu báo cáo chính xác. Vui lòng thử lại; không hiển thị các số 0 dễ gây hiểu nhầm.</CardContent></Card> : <>
      <Card><CardContent className="p-3 sm:p-4"><FinancialReportFilters range={range} filters={filters} currency={currency} currencies={ledger.currencies.map(c => c.code)} accounts={ledger.accounts.filter(a => a.currency_code === currency).map(a => ({ id: a.id, name: a.name }))} categories={ledger.categories.map(c => ({ id: c.id, name: c.name }))} /></CardContent></Card>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{metricCards.map((k) => { const Icon = k.icon; return <Card key={k.label} className="min-w-0"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2"><Icon className={`size-4 ${k.color}`} /><span className="text-[11px] font-bold text-[var(--muted-foreground)]">{k.label}</span></div><p className={`mt-2 break-words text-base font-black tabular-nums sm:text-xl ${k.color}`}>{k.amount === null ? comparison.current.savingsRate === null ? "—" : `${comparison.current.savingsRate.toLocaleString("vi-VN")}%` : money(k.amount)}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{percent(k.delta, k.amount === null ? " điểm %" : "%")} · {k.explanation}</p></CardContent></Card>; })}</div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
        <Card><CardContent className="p-4 sm:p-5"><FinancialTrendExplorer rows={monthly} currency={currency} decimalDigits={digits} reportFrom={range.from} reportTo={range.to} /></CardContent></Card>
        <Card><CardContent className="p-4 sm:p-5"><h2 className="flex items-center gap-2 font-black"><Info className="size-4 text-[var(--primary)]" /> Điểm đáng chú ý</h2><div className="mt-4 space-y-3">{insights.map((insight) => <div key={insight.headline} className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/35 p-3"><div className="flex items-center gap-2">{insight.tone === "warning" ? <ArrowUpRight className="size-4 text-rose-500" /> : <ArrowDownRight className="size-4 text-emerald-500" />}<h3 className="text-sm font-black">{insight.headline}</h3></div><p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">{insight.explanation}</p></div>)}</div><p className="mt-3 text-[11px] text-[var(--muted-foreground)]">Chỉ số được tính từ dữ liệu đã ghi nhận; không phải dự báo hoặc lời khuyên đầu tư.</p></CardContent></Card>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card><CardContent className="p-4 sm:p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-black">Cơ cấu chi tiêu theo danh mục</h2><span className="text-xs font-semibold text-[var(--muted-foreground)]">{currency}</span></div>{categories.length ? <ReportVisualBoundary><ReportDonut slices={categories.map((row) => ({ ...row, color: iconColorValue(row.icon_color), href: `/transactions?category=${encodeURIComponent(row.id)}&from=${range.from}&to=${range.to}&type=expense` }))} total={comparison.current.expense} currency={currency} decimalDigits={digits} centerLabel="Tổng chi" /></ReportVisualBoundary> : <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">Không có khoản chi trong kỳ.</p>}</CardContent></Card>
        <Card><CardContent className="p-4 sm:p-5"><h2 className="font-black">So sánh danh mục với kỳ trước</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Chọn danh mục để xem giao dịch</p><div className="mt-3 max-h-[370px] space-y-2 overflow-y-auto pr-1">{movements.slice(0, 10).map((row) => <Link href={`/transactions?category=${encodeURIComponent(row.id)}&from=${range.from}&to=${range.to}&type=expense`} key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-2.5 transition-colors hover:bg-[var(--muted)]"><span className="min-w-0"><span className="block truncate text-xs font-bold">{row.label}</span><span className="block text-[11px] text-[var(--muted-foreground)]">Trước: {money(row.previous)}</span></span><span className="shrink-0 text-right"><span className="block text-xs font-black">{money(row.current)}</span><span className={`text-[11px] font-bold ${row.delta > 0 ? "text-rose-500" : "text-emerald-500"}`}>{row.change === null ? "Kỳ trước không có" : percent(row.change)}</span></span></Link>)}{movements.length === 0 && <p className="py-6 text-sm text-[var(--muted-foreground)]">Chưa có dữ liệu chi tiêu.</p>}</div></CardContent></Card>
      </div>
      <Card><CardContent className="p-4 sm:p-5"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-black">Chi theo tài khoản</h2><Link href={`/reports/statements?${query}`} className="text-xs font-bold text-[var(--primary)]">Xem báo cáo chi tiết</Link></div><div className="grid gap-2 md:grid-cols-2">{accounts.map((row) => <Link key={row.id} href={`/transactions?account=${encodeURIComponent(row.id)}&from=${range.from}&to=${range.to}`} className="rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--muted)]"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold">{row.label}</span><span className="text-xs font-black">{row.percent}%</span></div><p className="mt-1 text-sm font-black">{money(row.amount)}</p><div className="mt-2 h-1.5 rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{width: `${Math.min(100, row.percent)}%`}} /></div></Link>)}{!accounts.length && <p className="text-sm text-[var(--muted-foreground)]">Chưa có chi tiêu theo tài khoản.</p>}</div></CardContent></Card>
      <p className="text-[11px] text-[var(--muted-foreground)]">Báo cáo không gộp các loại tiền tệ. Chuyển tiền, nghiệp vụ nợ và giao dịch ngoài nhóm thông thường không được cộng vào tổng Thu/Chi. Mốc so sánh là khoảng ngay trước kỳ chọn với cùng số ngày.</p>
    </>}
  </div>;
}
