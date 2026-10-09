import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, Banknote, CalendarClock, CalendarRange, CircleDollarSign, CreditCard, HeartPulse, Landmark, PiggyBank, Plus, Scale, Smartphone, Sparkles, Target, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { formatMinorMoney } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { CashflowChart } from "@/components/cashflow-chart";
import { TransactionList } from "@/components/transaction-list";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { budgetProgress, budgetSummary, loadBudgets, monthStartFromKey } from "@/features/budgets/data";
import { loadSavingsGoals, savingsGoalProgress, savingsGoalSummary } from "@/features/goals/data";
import { loadFinancialGoalPlan } from "@/features/goals/planner-data";
import { depositProjections, depositSummary, loadDeposits } from "@/features/deposits/data";
import { loanProjections, loanSummary, loadLoans } from "@/features/loans/data";
import { creditCardSummary, loadCreditCards, projectCreditCards } from "@/features/credit-cards/data";
import { requireUser } from "@/lib/auth";
import { loadRecurringData, projectRecurringOccurrences, todayInTimeZone as recurringToday } from "@/features/recurring/data";
import type { AccountType } from "@/features/accounts/constants";
import { cashflowSeries, currentMonthKey, currencyDigits, expenseCategories, loadLedger, monthTotals, sixMonthWindow } from "@/features/transactions/data";

const accountIcons = { bank: Landmark, cash: Banknote, ewallet: Smartphone, savings: PiggyBank };

function percentChange(current: number, previous: number) {
  if (previous === 0) return undefined;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export default async function OverviewPage() {
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const defaultCurrency = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const months = sixMonthWindow(timeZone);
  const ledger = await loadLedger(supabase, userId, { fromDate: `${months[0].key}-01`, limit: 1000 });
  const accounts = ledger.accounts.filter((account) => !account.is_archived);
  const digits = currencyDigits(ledger.currencies, defaultCurrency);
  const totalMinor = accounts.filter((account) => account.currency_code === defaultCurrency).reduce((sum, account) => sum + account.current_balance_minor, 0);
  const currentMonth = currentMonthKey(timeZone);
  const recurringTodayKey = recurringToday(timeZone);
  const [currentBudgets, recurring, goalData, depositData, loanData, creditCardData, healthSnapshotResult, goalPlanData] = await Promise.all([
    loadBudgets(supabase, userId, monthStartFromKey(currentMonth), false),
    loadRecurringData(supabase, userId),
    loadSavingsGoals(supabase, userId, false),
    loadDeposits(supabase, userId, false),
    loadLoans(supabase, userId, false),
    loadCreditCards(supabase, userId, false),
    (supabase as any).from("financial_health_snapshots").select("overall_score, data_confidence, snapshot_date").eq("user_id", userId).eq("currency_code", defaultCurrency).order("snapshot_date", { ascending: false }).limit(1).maybeSingle(),
    loadFinancialGoalPlan(supabase, userId, defaultCurrency)
  ]);
  const budgetRows = budgetProgress(currentBudgets, ledger.transactions, ledger.categories);
  const budgetState = budgetSummary(budgetRows, defaultCurrency);
  const goalProgress = savingsGoalProgress(goalData.goals, goalData.entries, goalData.accounts, recurringTodayKey);
  const goalState = savingsGoalSummary(goalProgress, defaultCurrency);
  const goalPlanAllocated = goalPlanData.allocations.reduce((sum, row) => sum + row.monthly_allocation_minor, 0);
  const dashboardGoals = goalProgress.filter((goal) => !goal.is_archived && goal.currency_code === defaultCurrency).slice(0, 3);
  const depositRows = depositProjections(depositData.deposits, depositData.entries, depositData.accounts, recurringTodayKey);
  const depositState = depositSummary(depositRows, defaultCurrency);
  const loanRows = loanProjections(loanData.loans, loanData.payments, loanData.accounts, recurringTodayKey);
  const loanState = loanSummary(loanRows, defaultCurrency);
  const creditCardRows = projectCreditCards(creditCardData.cards, creditCardData.statements, creditCardData.payments, creditCardData.accounts, recurringTodayKey);
  const creditCardState = creditCardSummary(creditCardRows, defaultCurrency);
  const lastHealthSnapshot = healthSnapshotResult?.data ?? null;
  const netWorthAssets = totalMinor + depositState.principal;
  const netWorthLiabilities = loanState.remaining + creditCardState.totalBalance;
  const netWorth = netWorthAssets - netWorthLiabilities;
  const current = monthTotals(ledger.transactions, defaultCurrency, currentMonth);
  const previous = monthTotals(ledger.transactions, defaultCurrency, months.at(-2)?.key ?? currentMonth);
  const series = cashflowSeries(ledger.transactions, defaultCurrency, timeZone);
  const categories = expenseCategories(ledger.transactions, defaultCurrency, currentMonth);
  const recurringEnd = new Date(`${recurringTodayKey}T00:00:00Z`);
  recurringEnd.setUTCDate(recurringEnd.getUTCDate() + 14);
  const upcomingRecurring = projectRecurringOccurrences(
    recurring.rules.filter((rule) => rule.is_active),
    recurring.occurrences,
    recurringTodayKey,
    recurringEnd.toISOString().slice(0, 10),
    recurringTodayKey
  ).filter((item) => item.status === "upcoming" || item.status === "due" || item.status === "overdue");
  const today = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone }).format(new Date());

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold capitalize text-[var(--primary)]">{today}</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Tổng quan tài chính</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Dashboard dùng Account + Transaction ledger thật và Category Engine có icon. Transfer không được tính thành thu nhập hoặc chi tiêu.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/accounts?new=1" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-bold"><Plus className="size-4" /> Tài khoản</Link><Link href="/transactions?new=expense" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white"><Plus className="size-4" /> Giao dịch</Link></div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Tổng số dư · ${defaultCurrency}`} formattedValue={formatMinorMoney(totalMinor, defaultCurrency, digits)} icon={WalletCards} />
        <StatCard label={`Thu nhập tháng · ${defaultCurrency}`} formattedValue={formatMinorMoney(current.income, defaultCurrency, digits)} delta={percentChange(current.income, previous.income)} icon={TrendingUp} tone="positive" />
        <StatCard label={`Chi tiêu tháng · ${defaultCurrency}`} formattedValue={formatMinorMoney(current.expense, defaultCurrency, digits)} delta={percentChange(current.expense, previous.expense)} icon={TrendingDown} tone="negative" />
        <StatCard label={`Dòng tiền ròng · ${defaultCurrency}`} formattedValue={formatMinorMoney(current.net, defaultCurrency, digits)} delta={percentChange(current.net, previous.net)} icon={CircleDollarSign} tone={current.net >= 0 ? "positive" : "negative"} />
      </div>

      <Card className="mt-4 fin-card border-emerald-500/20">
        <CardContent className="flex min-w-0 flex-wrap items-center gap-4 p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600"><Scale className="size-5" /></div>
          <div className="min-w-[180px] flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-black">Tài sản ròng · {defaultCurrency}</h2><span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${netWorth >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-500"}`}>{netWorth >= 0 ? "Positive" : "Negative"}</span></div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Net Worth {formatMinorMoney(netWorth, defaultCurrency, digits)} · Tài sản {formatMinorMoney(netWorthAssets, defaultCurrency, digits)} · Nợ {formatMinorMoney(netWorthLiabilities, defaultCurrency, digits)}</p>
          </div>
          <Link href="/net-worth" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold">Financial Position <ArrowRight className="size-3.5" /></Link>
        </CardContent>
      </Card>

      <Card className="mt-4 fin-card border-sky-500/20">
        <CardContent className="flex min-w-0 flex-wrap items-center gap-4 p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-600"><HeartPulse className="size-5" /></div>
          <div className="min-w-[180px] flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-black">Financial Health</h2>{lastHealthSnapshot && <span className="rounded-lg bg-[var(--muted)] px-2 py-1 text-[10px] font-black uppercase">{lastHealthSnapshot.overall_score}/100</span>}</div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{lastHealthSnapshot ? `Snapshot gần nhất ${lastHealthSnapshot.snapshot_date.split("-").reverse().join("/")} · confidence ${lastHealthSnapshot.data_confidence}%` : "Mở Financial Health để tính score trực tiếp từ cash flow, budget, debt, credit và Net Worth."}</p>
          </div>
          <Link href="/health" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold">Xem sức khỏe tài chính <ArrowRight className="size-3.5" /></Link>
        </CardContent>
      </Card>

      <Card className="mt-4 fin-card border-violet-500/20">
        <CardContent className="flex min-w-0 flex-wrap items-center gap-4 p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-600"><Activity className="size-5" /></div>
          <div className="min-w-[180px] flex-1"><h2 className="font-black">Forecasting & Scenario Planning</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Xem trước Cash Position 30/90/180/365 ngày và stress-test các kịch bản tăng thu, giảm chi, trả nợ hoặc reserve tiết kiệm.</p></div>
          <Link href="/forecast" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold">Mở dự báo <ArrowRight className="size-3.5" /></Link>
        </CardContent>
      </Card>

      <Card className="mt-4 fin-card border-emerald-500/20">
        <CardContent className="flex min-w-0 flex-wrap items-center gap-4 p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600"><CalendarRange className="size-5" /></div>
          <div className="min-w-[180px] flex-1"><h2 className="font-black">Smart Cash Flow Planner</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Lập kế hoạch thu nhập, nghĩa vụ, chi linh hoạt, reserve và mức đệm tiền mặt để biết Safe to Spend theo từng tháng.</p></div>
          <Link href="/cash-flow" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold">Lập kế hoạch <ArrowRight className="size-3.5" /></Link>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--sidebar-accent)] text-[var(--primary)]"><Target className="size-5" /></div>
          <div className="min-w-[180px] flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-black">Ngân sách tháng</h2>{budgetState.overCount > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2 py-1 text-[10px] font-black uppercase text-rose-500"><AlertTriangle className="size-3" /> {budgetState.overCount} vượt</span>}</div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{budgetState.count > 0 ? `${budgetState.count} category · Đã chi ${formatMinorMoney(budgetState.actual, defaultCurrency, digits)} / ${formatMinorMoney(budgetState.allocated, defaultCurrency, digits)}` : `Chưa thiết lập Budget Engine cho ${defaultCurrency} tháng này.`}</p>
          </div>
          {budgetState.count > 0 && <div className="min-w-[160px] flex-1 sm:max-w-xs"><div className="mb-1.5 flex justify-between text-[11px] font-bold"><span>{budgetState.allocated > 0 ? Math.min(999, Math.round((budgetState.actual / budgetState.allocated) * 100)) : 0}%</span><span className="text-[var(--muted-foreground)]">Còn {formatMinorMoney(budgetState.remaining, defaultCurrency, digits)}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className={`h-full rounded-full ${budgetState.overCount > 0 ? "bg-rose-500" : "bg-[var(--primary)]"}`} style={{width:`${budgetState.allocated > 0 ? Math.min(100, Math.round((budgetState.actual / budgetState.allocated) * 100)) : 0}%`}} /></div></div>}
          <Link href="/budgets" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold">Quản lý ngân sách <ArrowRight className="size-3.5" /></Link>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--sidebar-accent)] text-[var(--primary)]"><CalendarClock className="size-5" /></div>
          <div className="min-w-[180px] flex-1">
            <h2 className="font-black">Lịch tài chính · 14 ngày tới</h2>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{upcomingRecurring.length > 0 ? `${upcomingRecurring.length} khoản định kỳ cần theo dõi. Gần nhất: ${upcomingRecurring[0]?.rule.title} · ${upcomingRecurring[0]?.dueDate.split("-").reverse().join("/")}.` : "Không có khoản định kỳ nào cần xử lý trong 14 ngày tới."}</p>
          </div>
          <Link href="/recurring" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold">Mở lịch tài chính <ArrowRight className="size-3.5" /></Link>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--sidebar-accent)] text-[var(--primary)]"><PiggyBank className="size-5" /></div>
            <div className="min-w-[180px] flex-1">
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-black">Mục tiêu tiết kiệm</h2>{goalState.attention > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase text-amber-500"><AlertTriangle className="size-3" /> {goalState.attention} cần chú ý</span>}</div>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{goalState.count > 0 ? `Đã tiết kiệm ${formatMinorMoney(goalState.saved, defaultCurrency, digits)} / ${formatMinorMoney(goalState.target, defaultCurrency, digits)} · ${goalState.percent}%` : `Chưa có Savings Goal nào bằng ${defaultCurrency}.`}</p>
            </div>
            <Link href="/goals" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold">Mở mục tiêu <ArrowRight className="size-3.5" /></Link>
          </div>
          {dashboardGoals.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-3">{dashboardGoals.map((goal) => <div key={goal.id} className="rounded-xl border border-[var(--border)] p-3"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-[var(--sidebar-accent)]" style={{ color: iconColorValue(goal.icon_color) }}><CategoryIcon name={goal.icon_name} className="size-3.5" /></span><span className="min-w-0 flex-1 truncate text-xs font-black">{goal.name}</span><span className="text-[10px] font-black text-[var(--muted-foreground)]">{goal.percent}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className={`h-full rounded-full ${goal.status === "behind" || goal.status === "overdue" ? "bg-amber-500" : goal.status === "completed" ? "bg-emerald-500" : "bg-[var(--primary)]"}`} style={{width:`${Math.max(0, Math.min(100, goal.percent))}%`}} /></div></div>)}</div>}
        </CardContent>
      </Card>

      <Card className="mt-4 fin-card border-violet-500/20">
        <CardContent className="flex min-w-0 flex-wrap items-center gap-4 p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-600"><Sparkles className="size-5" /></div>
          <div className="min-w-[180px] flex-1"><h2 className="font-black">Financial Goals Planner</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{goalPlanData.plan ? `Nguồn tiền ${formatMinorMoney(goalPlanData.plan.monthly_available_minor, defaultCurrency, digits)}/tháng · đã phân bổ ${formatMinorMoney(goalPlanAllocated, defaultCurrency, digits)} cho ${goalPlanData.allocations.length} mục tiêu.` : "Điều phối nhiều Savings Goal trên cùng nguồn tiền và phát hiện thiếu hụt trước target date."}</p></div>
          <Link href="/goal-planner" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold">Lập kế hoạch mục tiêu <ArrowRight className="size-3.5" /></Link>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--sidebar-accent)] text-[var(--primary)]"><Landmark className="size-5" /></div>
          <div className="min-w-[180px] flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-black">Tiền gửi & lãi suất</h2>{depositState.dueSoon > 0 && <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase text-amber-500">{depositState.dueSoon} đáo hạn cần chú ý</span>}</div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{depositState.count > 0 ? `Gốc ${formatMinorMoney(depositState.principal, defaultCurrency, digits)} · Lãi dự kiến ${formatMinorMoney(depositState.projectedInterest, defaultCurrency, digits)}${depositState.next ? ` · gần nhất ${depositState.next.maturity_date.split("-").reverse().join("/")}` : ""}` : `Chưa có khoản tiền gửi nào bằng ${defaultCurrency}.`}</p>
          </div>
          <Link href="/deposits" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold">Quản lý tiền gửi <ArrowRight className="size-3.5" /></Link>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="flex min-w-0 flex-wrap items-center gap-4 p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-600"><CreditCard className="size-5" /></div>
          <div className="min-w-[180px] flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-black">Khoản vay & dư nợ</h2>{loanState.dueSoon > 0 && <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase text-amber-600">{loanState.dueSoon} kỳ cần chú ý</span>}</div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{loanState.count > 0 ? `Dư nợ ${formatMinorMoney(loanState.remaining, defaultCurrency, digits)} · Đã trả gốc ${formatMinorMoney(loanState.paidPrincipal, defaultCurrency, digits)}${loanState.next?.next_due_date ? ` · kỳ gần nhất ${loanState.next.next_due_date.split("-").reverse().join("/")}` : ""}` : `Chưa có khoản vay nào bằng ${defaultCurrency}.`}</p>
          </div>
          <Link href="/loans" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold">Quản lý dư nợ <ArrowRight className="size-3.5" /></Link>
        </CardContent>
      </Card>

      <Card className="mt-4 fin-card">
        <CardContent className="flex min-w-0 flex-wrap items-center gap-4 p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-600"><CreditCard className="size-5" /></div>
          <div className="min-w-[180px] flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-black">Thẻ tín dụng</h2>{(creditCardState.highUtilization > 0 || creditCardState.dueAttention > 0) && <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase text-amber-600">{creditCardState.highUtilization + creditCardState.dueAttention} cần chú ý</span>}</div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{creditCardState.count > 0 ? `Dư nợ ${formatMinorMoney(creditCardState.totalBalance, defaultCurrency, digits)} / hạn mức ${formatMinorMoney(creditCardState.totalLimit, defaultCurrency, digits)} · khả dụng ${formatMinorMoney(creditCardState.available, defaultCurrency, digits)}` : `Chưa có thẻ tín dụng nào bằng ${defaultCurrency}.`}</p>
          </div>
          <Link href="/credit-cards" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold">Quản lý thẻ <ArrowRight className="size-3.5" /></Link>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_.8fr]">
        <Card><CardHeader><div><h2 className="font-bold">Dòng tiền 6 tháng</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Income / Expense thật theo {defaultCurrency}; transfer được loại khỏi cash-flow spending.</p></div><span className="rounded-lg bg-[var(--muted)] px-2.5 py-1.5 text-xs font-semibold">6 tháng</span></CardHeader><CardContent><CashflowChart data={series} decimalDigits={digits} /></CardContent></Card>
        <Card><CardHeader><div><h2 className="font-bold">Chi tiêu theo nhóm</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Top category tháng hiện tại · {defaultCurrency}</p></div></CardHeader><CardContent className="space-y-4">{categories.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center"><p className="text-sm font-semibold">Chưa có chi tiêu tháng này</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Danh mục sẽ xuất hiện khi bạn ghi nhận Expense.</p></div> : categories.map((item)=><div key={item.label}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 font-medium"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--sidebar-accent)]" style={{ color: iconColorValue(item.icon_color) }}><CategoryIcon name={item.icon_name} className="size-3.5" /></span><span className="truncate">{item.label}</span></span><span className="text-xs font-semibold text-[var(--muted-foreground)]">{formatMinorMoney(item.value, defaultCurrency, digits)}</span></div><div className="h-2 rounded-full bg-[var(--muted)]"><div className="h-2 rounded-full bg-[var(--primary)]" style={{width:`${item.percent}%`}} /></div></div>)}</CardContent></Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[.8fr_1.45fr]">
        <Card>
          <CardHeader><div><h2 className="font-bold">Tài khoản</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{accounts.length} tài khoản đang hoạt động</p></div><Link href="/accounts" className="text-xs font-bold text-[var(--primary)]">Xem tất cả</Link></CardHeader>
          <CardContent className="space-y-3">
            {accounts.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] p-5 text-center"><p className="text-sm font-semibold">Chưa có tài khoản</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Tạo tài khoản đầu tiên trước khi ghi giao dịch.</p><Link href="/accounts?new=1" className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-xs font-bold text-white"><Plus className="size-3.5" /> Thêm tài khoản</Link></div> : accounts.slice(0, 4).map((account) => {
              const type = account.account_type as AccountType;
              const Icon = accountIcons[type] ?? Landmark;
              const accountDigits = currencyDigits(ledger.currencies, account.currency_code);
              return <div key={account.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><div className="grid size-10 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><Icon className="size-4.5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{account.name}</p><p className="truncate text-xs text-[var(--muted-foreground)]">{account.institution_name || account.currency_code}</p></div><div className="text-right text-sm font-bold">{formatMinorMoney(account.current_balance_minor, account.currency_code, accountDigits)}</div></div>;
            })}
          </CardContent>
        </Card>
        <Card><CardHeader><div><h2 className="font-bold">Giao dịch gần đây</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Dữ liệu ledger thật từ Supabase</p></div><Link href="/transactions" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)]">Xem tất cả <ArrowRight className="size-3.5" /></Link></CardHeader><CardContent><TransactionList transactions={ledger.transactions} currencies={ledger.currencies} limit={5} /></CardContent></Card>
      </div>
    </div>
  );
}
