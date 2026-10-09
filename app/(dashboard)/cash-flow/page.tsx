import Link from "next/link";
import { ArrowRight, CalendarRange, CircleDollarSign, PiggyBank, ShieldCheck, WalletCards } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { CashFlowPlanner } from "@/components/cash-flow-planner";
import { Card, CardContent } from "@/components/ui/card";
import { loadCashFlowPlannerData } from "@/features/cash-flow/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const metadata = { title: "Smart Cash Flow Planner" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string; message?: string }>;

export default async function CashFlowPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const data = await loadCashFlowPlannerData(supabase, userId);
  const current = data.months[0];
  const next = data.months[1];
  const money = (value: number) => formatMinorMoney(value, data.currency_code, data.decimal_digits);
  const currentFixed = current?.fixed_obligations_minor ?? 0;
  const currentFree = current ? Math.max(0, current.income_minor - currentFixed) : 0;

  return <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-[var(--primary)]">Planning · Monthly Allocation</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Smart Cash Flow Planner</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">Biến Forecast thành kế hoạch hành động theo từng tháng: giữ tiền cho nghĩa vụ, savings reserve, trả nợ thêm và xác định Safe to Spend trước khi chi.</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/forecast" className="fin-secondary-btn">Dự báo</Link><Link href="/goal-planner" className="fin-secondary-btn">Kế hoạch mục tiêu</Link><Link href="/health" className="fin-primary-btn">Sức khỏe tài chính <ArrowRight className="size-4" /></Link></div>
    </div>

    <AuthMessage error={params.error} message={params.message} />

    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="fin-card"><CardContent className="p-5"><WalletCards className="size-5 text-[var(--primary)]" /><p className="fin-stat-label">Cash hiện tại · {data.currency_code}</p><p className="fin-stat-value">{money(data.current_liquid_balance_minor)}</p><p className="fin-stat-help">Nguồn tiền thanh khoản đang có</p></CardContent></Card>
      <Card className="fin-card"><CardContent className="p-5"><CircleDollarSign className="size-5 text-emerald-600" /><p className="fin-stat-label">Thu nhập baseline · tháng này</p><p className="fin-stat-value">{money(current?.income_minor ?? 0)}</p><p className="fin-stat-help">Forecast hiện tại trước điều chỉnh</p></CardContent></Card>
      <Card className="fin-card"><CardContent className="p-5"><ShieldCheck className="size-5 text-sky-600" /><p className="fin-stat-label">Nghĩa vụ cố định</p><p className="fin-stat-value">{money(currentFixed)}</p><p className="fin-stat-help">Recurring + Loan + Credit Card</p></CardContent></Card>
      <Card className="fin-card"><CardContent className="p-5"><PiggyBank className="size-5 text-violet-600" /><p className="fin-stat-label">Free cash từ thu nhập</p><p className="fin-stat-value">{money(currentFree)}</p><p className="fin-stat-help">Trước chi linh hoạt và reserve</p></CardContent></Card>
    </div>

    {next && <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"><CalendarRange className="mt-0.5 size-5 shrink-0 text-[var(--primary)]" /><div><p className="text-sm font-black">Nhìn trước tháng kế tiếp</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Baseline {next.label}: thu {money(next.income_minor)}, nghĩa vụ cố định {money(next.fixed_obligations_minor)}, closing cash dự kiến {money(next.closing_balance_minor)}.</p></div></div>}

    <div className="mt-4"><CashFlowPlanner months={data.months} currencyCode={data.currency_code} decimalDigits={data.decimal_digits} /></div>

    <Card className="mt-4 fin-card"><CardContent className="p-5"><h2 className="font-black">Cách Finzaro tính kế hoạch</h2><div className="mt-3 space-y-2">{data.notes.map((note) => <p key={note} className="text-xs leading-5 text-[var(--muted-foreground)]">• {note}</p>)}</div></CardContent></Card>
  </div>;
}
