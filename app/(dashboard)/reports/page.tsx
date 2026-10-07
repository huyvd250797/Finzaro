import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  Download,
  Lightbulb,
  Minus,
  ReceiptText,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CashflowChart } from "@/components/cashflow-chart";
import { CategoryIcon } from "@/features/categories/icons";
import { budgetProgress } from "@/features/budgets/data";
import { categoryScopeIds } from "@/features/budgets/data";
import { loadRecurringData, projectRecurringOccurrences, todayInTimeZone } from "@/features/recurring/data";
import {
  accountSpending,
  buildInsights,
  categorySpending,
  filterReportTransactions,
  loadReportBudgets,
  monthlyCashflow,
  normalizeReportFilters,
  previousComparableRange,
  reportTotals,
  resolveReportRange
} from "@/features/reports/data";
import { currencyDigits, loadLedger } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const metadata = { title: "Báo cáo & Insights" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function Delta({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null) return <span className="text-[11px] text-[var(--muted-foreground)]">Chưa đủ dữ liệu so sánh</span>;
  const good = inverse ? value <= 0 : value >= 0;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${good ? "text-emerald-600" : "text-rose-500"}`}><Icon className="size-3.5" />{Math.abs(value)}% <span className="font-medium text-[var(--muted-foreground)]">so với kỳ trước</span></span>;
}

function toneClass(tone: "positive" | "warning" | "negative" | "neutral") {
  if (tone === "positive") return "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300";
  if (tone === "warning") return "border-amber-500/20 bg-amber-500/8 text-amber-700 dark:text-amber-300";
  if (tone === "negative") return "border-rose-500/20 bg-rose-500/8 text-rose-700 dark:text-rose-300";
  return "border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)]";
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, one(value)])) as Record<string, string | undefined>;
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const defaultCurrency = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const range = resolveReportRange(params.range, params.from, params.to, timeZone);
  const previousRange = previousComparableRange(range);

  const ledger = await loadLedger(supabase, userId, { fromDate: previousRange.from, toDate: range.to, limit: 5000 });
  const currency = ledger.currencies.some((item) => item.code === params.currency) ? params.currency! : defaultCurrency;
  const requestedFilters = normalizeReportFilters({ ...params, currency }, range, defaultCurrency);
  const normalized = {
    ...requestedFilters,
    account: requestedFilters.account === "all" || ledger.accounts.some((item) => item.id === requestedFilters.account && item.currency_code === currency) ? requestedFilters.account : "all",
    category: requestedFilters.category === "all" || ledger.categories.some((item) => item.id === requestedFilters.category) ? requestedFilters.category : "all",
    type: ["all", "income", "expense", "transfer"].includes(requestedFilters.type) ? requestedFilters.type : "all"
  };
  const currentTransactions = filterReportTransactions(ledger.transactions, normalized, ledger.categories);
  const previousTransactions = filterReportTransactions(ledger.transactions, { ...normalized, from: previousRange.from, to: previousRange.to }, ledger.categories);
  const totals = reportTotals(currentTransactions, currency);
  const previous = reportTotals(previousTransactions, currency);
  const digits = currencyDigits(ledger.currencies, currency);
  const monthly = monthlyCashflow(currentTransactions, currency, range.from, range.to);
  const categories = categorySpending(currentTransactions, currency);
  const accounts = accountSpending(currentTransactions, currency, ledger.accounts);

  const [budgetRows, recurring] = await Promise.all([
    loadReportBudgets(supabase, userId, range.from, range.to),
    loadRecurringData(supabase, userId)
  ]);
  const budgetStates = normalized.type === "income" || normalized.type === "transfer"
    ? []
    : budgetProgress(budgetRows, currentTransactions, ledger.categories).filter((item) => item.currency_code === currency);
  const budgetAllocated = budgetStates.reduce((sum, item) => sum + item.amount_minor, 0);
  const budgetActual = budgetStates.reduce((sum, item) => sum + item.actual_minor, 0);

  const today = todayInTimeZone(timeZone);
  const recurringEndDate = new Date(`${today}T00:00:00Z`);
  recurringEndDate.setUTCDate(recurringEndDate.getUTCDate() + 30);
  const categoryScope = normalized.category !== "all" ? new Set(categoryScopeIds(normalized.category, ledger.categories)) : null;
  const accountById = new Map(ledger.accounts.map((account) => [account.id, account]));
  const upcoming = projectRecurringOccurrences(recurring.rules.filter((rule) => rule.is_active), recurring.occurrences, today, recurringEndDate.toISOString().slice(0, 10), today)
    .filter((item) => ["upcoming", "due", "overdue"].includes(item.status));
  let recurringExpense = 0;
  let recurringCount = 0;
  for (const item of upcoming) {
    if (item.rule.transaction_type !== "expense") continue;
    if (categoryScope && (!item.rule.category_id || !categoryScope.has(item.rule.category_id))) continue;
    if (normalized.account !== "all" && item.rule.from_account_id !== normalized.account) continue;
    const account = item.rule.from_account_id ? accountById.get(item.rule.from_account_id) : null;
    if (!account || account.currency_code !== currency || item.rule.from_amount_minor == null) continue;
    recurringExpense += Math.abs(item.rule.from_amount_minor);
    recurringCount += 1;
  }

  const insights = buildInsights({ totals, previous, categories, budgetAllocated, budgetActual, recurringExpense, currency });
  const savingsRate = totals.income > 0 ? Math.round((totals.net / totals.income) * 1000) / 10 : null;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  query.set("range", range.key);
  query.set("currency", currency);
  if (range.key === "custom") { query.set("from", range.from); query.set("to", range.to); }

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">Analytics · {range.label}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Báo cáo & Financial Insights</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">Phân tích trực tiếp từ Transaction Ledger, Category Engine, Budget và Recurring. Transfer được tách khỏi Income/Expense để không làm sai dòng tiền.</p>
        </div>
        <Link href={`/api/reports/export?${query.toString()}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-bold"><Download className="size-4" /> Xuất CSV</Link>
      </div>

      <Card className="mt-6"><CardContent className="p-4 sm:p-5">
        <form method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-[var(--muted-foreground)]">Khoảng thời gian</span><select name="range" defaultValue={range.key} className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-semibold"><option value="this_month">Tháng này</option><option value="last_month">Tháng trước</option><option value="3m">3 tháng</option><option value="6m">6 tháng</option><option value="12m">12 tháng</option><option value="ytd">Năm nay</option><option value="custom">Tùy chọn</option></select></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-[var(--muted-foreground)]">Từ ngày</span><input type="date" name="from" defaultValue={range.from} className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs" /></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-[var(--muted-foreground)]">Đến ngày</span><input type="date" name="to" defaultValue={range.to} className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs" /></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-[var(--muted-foreground)]">Tiền tệ</span><select name="currency" defaultValue={currency} className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-semibold">{ledger.currencies.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-[var(--muted-foreground)]">Tài khoản</span><select name="account" defaultValue={normalized.account} className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs"><option value="all">Tất cả</option>{ledger.accounts.filter((item) => item.currency_code === currency).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-[var(--muted-foreground)]">Danh mục</span><select name="category" defaultValue={normalized.category} className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs"><option value="all">Tất cả</option>{ledger.categories.filter((item) => !item.is_archived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="grid grid-cols-[1fr_auto] gap-2"><label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-[var(--muted-foreground)]">Loại</span><select name="type" defaultValue={normalized.type} className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs"><option value="all">Tất cả</option><option value="income">Thu nhập</option><option value="expense">Chi tiêu</option><option value="transfer">Chuyển tiền</option></select></label><button className="mt-[22px] h-10 rounded-xl bg-[var(--primary)] px-4 text-xs font-black text-white">Áp dụng</button></div>
        </form>
      </CardContent></Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent><TrendingUp className="size-5 text-emerald-500" /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Thu nhập · {currency}</p><p className="mt-1 text-2xl font-black">{formatMinorMoney(totals.income, currency, digits)}</p><div className="mt-2"><Delta value={percentDelta(totals.income, previous.income)} /></div></CardContent></Card>
        <Card><CardContent><TrendingDown className="size-5 text-rose-500" /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Chi tiêu · {currency}</p><p className="mt-1 text-2xl font-black">{formatMinorMoney(totals.expense, currency, digits)}</p><div className="mt-2"><Delta value={percentDelta(totals.expense, previous.expense)} inverse /></div></CardContent></Card>
        <Card><CardContent><CircleDollarSign className="size-5 text-[var(--primary)]" /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Dòng tiền ròng</p><p className={`mt-1 text-2xl font-black ${totals.net < 0 ? "text-rose-500" : ""}`}>{formatMinorMoney(totals.net, currency, digits)}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">Savings rate: {savingsRate === null ? "—" : `${savingsRate}%`}</p></CardContent></Card>
        <Card><CardContent><ReceiptText className="size-5 text-[var(--primary)]" /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Giao dịch</p><p className="mt-1 text-2xl font-black">{totals.count}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">TB chi tiêu: {formatMinorMoney(totals.avgExpense, currency, digits)}</p></CardContent></Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_.9fr]">
        <Card><CardContent><div className="mb-5 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><BarChart3 className="size-5" /></div><div><h2 className="font-black">Cash Flow Trend</h2><p className="text-xs text-[var(--muted-foreground)]">{range.label} · {currency}</p></div></div><CashflowChart data={monthly.map((row) => ({ month: row.month, income: row.income, expense: row.expense }))} decimalDigits={digits} /></CardContent></Card>
        <Card><CardContent><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-500"><Lightbulb className="size-5" /></div><div><h2 className="font-black">Financial Insights</h2><p className="text-xs text-[var(--muted-foreground)]">Rule-based · không dùng AI</p></div></div><div className="mt-4 space-y-2.5">{insights.map((item, index) => <div key={`${item.title}-${index}`} className={`rounded-xl border p-3 ${toneClass(item.tone)}`}><p className="text-sm font-black">{item.title}</p><p className="mt-1 text-xs leading-5 opacity-80">{item.description}</p></div>)}</div></CardContent></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card><CardContent><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><WalletCards className="size-5" /></div><div><h2 className="font-black">Chi tiêu theo danh mục</h2><p className="text-xs text-[var(--muted-foreground)]">Top category trong kỳ</p></div></div><div className="mt-5 space-y-4">{categories.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">Chưa có chi tiêu phù hợp bộ lọc.</p> : categories.slice(0, 8).map((item) => <div key={item.id}><div className="flex items-center gap-3"><div className="grid size-8 place-items-center rounded-lg bg-[var(--sidebar-accent)] text-[var(--primary)]"><CategoryIcon name={item.icon_name} className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-3 text-xs"><span className="truncate font-bold">{item.label}</span><span className="font-black">{formatMinorMoney(item.amount, currency, digits)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${Math.max(2, Math.min(100, item.percent))}%` }} /></div></div><span className="w-12 text-right text-[10px] font-bold text-[var(--muted-foreground)]">{item.percent}%</span></div></div>)}</div></CardContent></Card>
        <Card><CardContent><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><WalletCards className="size-5" /></div><div><h2 className="font-black">Chi tiêu theo tài khoản</h2><p className="text-xs text-[var(--muted-foreground)]">Nguồn tiền chi trong kỳ</p></div></div><div className="mt-5 space-y-4">{accounts.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">Chưa có dữ liệu theo tài khoản.</p> : accounts.slice(0, 8).map((item) => <div key={item.id}><div className="flex justify-between gap-3 text-xs"><span className="font-bold">{item.label}</span><span className="font-black">{formatMinorMoney(item.amount, currency, digits)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(2, Math.min(100, item.percent))}%` }} /></div><p className="mt-1 text-right text-[10px] font-bold text-[var(--muted-foreground)]">{item.percent}%</p></div>)}</div></CardContent></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card><CardContent><div className="flex items-center gap-3"><Target className="size-5 text-[var(--primary)]" /><div><h2 className="font-black">Budget vs Actual</h2><p className="text-xs text-[var(--muted-foreground)]">Theo các budget nằm trong kỳ đang xem</p></div></div><div className="mt-5">{budgetStates.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">Không có budget phù hợp trong kỳ.</p> : <><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-[var(--muted)] p-3"><p className="text-[10px] uppercase text-[var(--muted-foreground)]">Phân bổ</p><p className="mt-1 text-sm font-black">{formatMinorMoney(budgetAllocated, currency, digits)}</p></div><div className="rounded-xl bg-[var(--muted)] p-3"><p className="text-[10px] uppercase text-[var(--muted-foreground)]">Đã chi</p><p className="mt-1 text-sm font-black">{formatMinorMoney(budgetActual, currency, digits)}</p></div><div className="rounded-xl bg-[var(--muted)] p-3"><p className="text-[10px] uppercase text-[var(--muted-foreground)]">Còn lại</p><p className="mt-1 text-sm font-black">{formatMinorMoney(Math.max(0, budgetAllocated - budgetActual), currency, digits)}</p></div></div><div className="mt-4 space-y-3">{budgetStates.slice(0, 6).map((item) => <div key={item.id} className="flex items-center gap-3"><CategoryIcon name={item.category.icon_name} className="size-4 text-[var(--primary)]" /><span className="min-w-0 flex-1 truncate text-xs font-bold">{item.category.name}</span><span className={`text-xs font-black ${item.status === "over" ? "text-rose-500" : item.status === "near" ? "text-amber-500" : ""}`}>{item.percent}%</span></div>)}</div></>}</div></CardContent></Card>
        <Card><CardContent><div className="flex items-center gap-3"><CalendarClock className="size-5 text-[var(--primary)]" /><div><h2 className="font-black">Recurring Commitments · 30 ngày</h2><p className="text-xs text-[var(--muted-foreground)]">Các khoản chi định kỳ chưa hoàn tất</p></div></div><div className="mt-5 rounded-2xl bg-[var(--muted)] p-5"><p className="text-xs font-bold text-[var(--muted-foreground)]">Nghĩa vụ dự kiến · {currency}</p><p className="mt-2 text-3xl font-black">{formatMinorMoney(recurringExpense, currency, digits)}</p><p className="mt-2 text-xs text-[var(--muted-foreground)]">{recurringCount} kỳ chi tiêu sắp tới phù hợp bộ lọc.</p></div><Link href="/recurring" className="mt-4 inline-flex text-xs font-black text-[var(--primary)] hover:underline">Mở Financial Calendar →</Link></CardContent></Card>
      </div>
    </div>
  );
}
