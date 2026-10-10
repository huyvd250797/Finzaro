import Link from "next/link";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ReportBarChart } from "@/components/report-bar-chart";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { categoryScopeIds } from "@/features/budgets/data";
import {
  categoryMonthlySeries,
  currentYearMonth,
  flowAmount,
  monthBounds,
  shiftMonthKey,
  validMonthKey,
  validYear,
  yearBounds,
  type ReportFlowType
} from "@/features/reports/experience";
import { currencyDigits, loadLedger } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { cn, formatMinorMoney } from "@/lib/utils";

export const metadata = { title: "Chi tiết danh mục" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Params = Promise<{ categoryId: string }>;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function monthKeysEndingAt(period: string, count: number) {
  return Array.from({ length: count }, (_, index) => shiftMonthKey(period, index - (count - 1)));
}

function signedMoney(value: number, type: ReportFlowType, currency: string, digits: number) {
  return `${type === "income" ? "+" : "-"}${formatMinorMoney(value, currency, digits).replace(/^[-+]/, "")}`;
}

export default async function ReportCategoryPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { categoryId } = await params;
  const raw = await searchParams;
  const query = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, one(value)])) as Record<string, string | undefined>;
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const currency = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const now = currentYearMonth(timeZone);
  const currentMonth = `${now.year}-${String(now.month).padStart(2, "0")}`;
  const mode: "month" | "year" = query.mode === "year" ? "year" : "month";
  const type: ReportFlowType = query.type === "income" ? "income" : "expense";
  const period = validMonthKey(query.period, currentMonth);
  const year = validYear(query.year, now.year);

  const chartMonthKeys = mode === "month" ? monthKeysEndingAt(period, 6) : Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
  const loadFrom = mode === "month" ? monthBounds(chartMonthKeys[0]).from : yearBounds(year).from;
  const loadTo = mode === "month" ? monthBounds(period).to : yearBounds(year).to;
  const ledger = await loadLedger(supabase, userId, { fromDate: loadFrom, toDate: loadTo, limit: 10000 });
  const category = ledger.categories.find((item) => item.id === categoryId);

  if (!category) {
    return <div className="mx-auto max-w-3xl px-4 py-10"><Card><CardContent><h1 className="text-xl font-black">Không tìm thấy danh mục</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Danh mục có thể đã bị xóa hoặc không thuộc tài khoản của bạn.</p><Link href="/reports" className="mt-5 inline-flex text-sm font-black text-[var(--primary)]">← Quay lại Báo cáo</Link></CardContent></Card></div>;
  }

  const digits = currencyDigits(ledger.currencies, currency);
  const scope = new Set(categoryScopeIds(category.id, ledger.categories));
  const series = categoryMonthlySeries(ledger.transactions, currency, type, scope, chartMonthKeys);
  const selectedFrom = mode === "month" ? monthBounds(period).from : yearBounds(year).from;
  const selectedTo = mode === "month" ? monthBounds(period).to : yearBounds(year).to;
  const selectedTransactions = ledger.transactions.filter((item) => item.transaction_date >= selectedFrom && item.transaction_date <= selectedTo && item.category_id && scope.has(item.category_id) && flowAmount(item, currency, type) > 0);
  const total = selectedTransactions.reduce((sum, item) => sum + flowAmount(item, currency, type), 0);
  const uniqueDays = new Set(selectedTransactions.map((item) => item.transaction_date)).size;
  const average = mode === "month" ? (uniqueDays > 0 ? Math.round(total / uniqueDays) : 0) : Math.round(total / (year === now.year ? Math.max(1, now.month) : 12));
  const periodLabel = mode === "month" ? `Tháng ${Number(period.slice(5, 7))}/${period.slice(0, 4)}` : `Năm ${year}`;
  const backHref = mode === "month" ? `/reports?mode=month&period=${period}&type=${type}` : `/reports?mode=year&year=${year}&type=${type}`;

  return (
    <div className="mx-auto max-w-[980px] px-3 py-5 sm:px-4 md:px-6 lg:px-8 lg:py-8">
      <div className="flex items-center gap-3">
        <Link href={backHref} aria-label="Quay lại" className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)]"><ChevronLeft className="size-5" /></Link>
        <div className="min-w-0"><p className="text-xs font-bold text-[var(--muted-foreground)]">Chi tiết danh mục</p><h1 className="truncate text-2xl font-black">{category.name}</h1></div>
      </div>

      <Card className="mt-5"><CardContent className="flex items-center gap-4 p-4 sm:p-5"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--muted)]" style={{ color: iconColorValue(category.icon_color) }}><CategoryIcon name={category.icon_name} className="size-7" /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold text-[var(--muted-foreground)]">{periodLabel}</p><p className="mt-1 break-words text-2xl font-black">{formatMinorMoney(total, currency, digits)}</p></div></CardContent></Card>

      <Card className="mt-4"><CardContent className="p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><BarChart3 className="size-5 text-[var(--primary)]" /><div><h2 className="font-black">{mode === "month" ? `${type === "expense" ? "Chi tiêu" : "Thu nhập"} 6 tháng gần đây` : `${type === "expense" ? "Chi tiêu" : "Thu nhập"} theo tháng`}</h2><p className="text-xs text-[var(--muted-foreground)]">{currency} · {category.name}</p></div></div><ReportBarChart data={series} decimalDigits={digits} ariaLabel={`${category.name} theo tháng`} /></CardContent></Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card className={type === "expense" ? "border-rose-500/20 bg-rose-500/[.035]" : "border-emerald-500/20 bg-emerald-500/[.035]"}><CardContent className="p-4"><p className="text-xs font-bold text-[var(--muted-foreground)]">Tổng</p><p className={cn("mt-1 text-2xl font-black", type === "expense" ? "text-rose-500" : "text-emerald-500")}>{formatMinorMoney(total, currency, digits)}</p></CardContent></Card>
        <Card className="border-sky-500/20 bg-sky-500/[.035]"><CardContent className="p-4"><p className="text-xs font-bold text-[var(--muted-foreground)]">{mode === "month" ? "Trung bình/ngày có giao dịch" : "Trung bình/tháng"}</p><p className="mt-1 text-2xl font-black text-sky-500">{formatMinorMoney(average, currency, digits)}</p></CardContent></Card>
      </div>

      {mode === "year" ? <Card className="mt-4 overflow-hidden"><CardContent className="p-0"><div className="border-b border-[var(--border)] p-4"><h2 className="font-black">Theo tháng</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Chạm một tháng để xem giao dịch chi tiết.</p></div><div className="divide-y divide-[var(--border)]">{series.map((item, index) => <Link key={item.key} href={`/reports/category/${categoryId}?mode=month&period=${item.key}&type=${type}`} className="flex items-center gap-3 p-4 active:bg-[var(--muted)]"><span className="min-w-0 flex-1 text-sm font-black">Tháng {index + 1}</span><span className="text-sm font-black">{formatMinorMoney(item.value, currency, digits)}</span><ChevronRight className="size-4 text-[var(--muted-foreground)]" /></Link>)}</div></CardContent></Card> : <Card className="mt-4 overflow-hidden"><CardContent className="p-0"><div className="border-b border-[var(--border)] p-4"><h2 className="font-black">Giao dịch {periodLabel.toLowerCase()}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{selectedTransactions.length} giao dịch thuộc {category.name}{scope.size > 1 ? " và danh mục con" : ""}.</p></div>{selectedTransactions.length === 0 ? <p className="p-6 text-sm text-[var(--muted-foreground)]">Chưa có giao dịch trong tháng này.</p> : <div className="divide-y divide-[var(--border)]">{selectedTransactions.map((transaction) => <Link key={transaction.id} href={`/transactions?q=${encodeURIComponent(transaction.title)}`} className="flex min-w-0 items-center gap-3 p-4 active:bg-[var(--muted)]"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--muted)]" style={{ color: iconColorValue(transaction.category?.icon_color) }}><CategoryIcon name={transaction.category?.icon_name} className="size-[18px]" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{transaction.title}</span><span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">{transaction.transaction_date}</span></span><span className={cn("shrink-0 text-sm font-black", type === "income" ? "text-emerald-500" : "text-rose-500")}>{signedMoney(flowAmount(transaction, currency, type), type, currency, digits)}</span><ChevronRight className="size-4 shrink-0 text-[var(--muted-foreground)]" /></Link>)}</div>}</CardContent></Card>}
    </div>
  );
}
