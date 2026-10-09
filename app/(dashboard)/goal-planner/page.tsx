import Link from "next/link";
import { ArrowRight, CircleDollarSign, PiggyBank, Target, WalletCards } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { FinancialGoalsPlanner } from "@/components/financial-goals-planner";
import { Card, CardContent } from "@/components/ui/card";
import { loadCashFlowPlannerData } from "@/features/cash-flow/data";
import { loadSavingsGoals, savingsGoalProgress } from "@/features/goals/data";
import { loadFinancialGoalPlan } from "@/features/goals/planner-data";
import { todayInTimeZone } from "@/features/recurring/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const metadata = { title: "Financial Goals Planner" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string; message?: string }>;

export default async function GoalPlannerPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const currencyCode = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const today = todayInTimeZone(timeZone);

  const [goalData, cashFlow, planData, currencyResult] = await Promise.all([
    loadSavingsGoals(supabase, userId, false),
    loadCashFlowPlannerData(supabase, userId),
    loadFinancialGoalPlan(supabase, userId, currencyCode),
    supabase.from("supported_currencies").select("decimal_digits").eq("code", currencyCode).maybeSingle()
  ]);
  const decimalDigits = currencyResult.data?.decimal_digits ?? 0;
  const progress = savingsGoalProgress(goalData.goals, goalData.entries, goalData.accounts, today)
    .filter((goal) => !goal.is_archived && goal.status !== "completed" && goal.currency_code === currencyCode);

  const currentMonth = cashFlow.months[0];
  const savedReserve = currentMonth?.saved_plan?.savings_reserve_minor ?? 0;
  const fallbackAvailable = currentMonth
    ? Math.max(0, currentMonth.income_minor - currentMonth.fixed_obligations_minor - currentMonth.baseline_discretionary_minor)
    : 0;
  const defaultMonthlyAvailable = savedReserve > 0 ? savedReserve : fallbackAvailable;
  const totalRemaining = progress.reduce((sum, goal) => sum + goal.remaining_minor, 0);
  const totalNeeded = progress.reduce((sum, goal) => sum + (goal.monthly_needed_minor ?? Math.ceil(goal.remaining_minor / 12)), 0);
  const monthlyAvailable = planData.plan?.monthly_available_minor ?? defaultMonthlyAvailable;

  return <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-[var(--primary)]">Planning · Goal Allocation</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Financial Goals Planner</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">Điều phối nhiều Savings Goal cùng một nguồn tiền: xếp ưu tiên, phân bổ hàng tháng, phát hiện thiếu hụt và ước tính target date mới trước khi bạn cam kết kế hoạch.</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/goals" className="fin-secondary-btn">Savings Goals</Link><Link href="/cash-flow" className="fin-primary-btn">Smart Cash Flow <ArrowRight className="size-4" /></Link></div>
    </div>

    <AuthMessage error={params.error} message={params.message} />

    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="fin-card"><CardContent className="p-5"><Target className="size-5 text-[var(--primary)]" /><p className="fin-stat-label">Mục tiêu đang điều phối</p><p className="fin-stat-value">{progress.length}</p><p className="fin-stat-help">Goal đang hoạt động · {currencyCode}</p></CardContent></Card>
      <Card className="fin-card"><CardContent className="p-5"><PiggyBank className="size-5 text-violet-600" /><p className="fin-stat-label">Tổng còn thiếu</p><p className="fin-stat-value">{formatMinorMoney(totalRemaining, currencyCode, decimalDigits)}</p><p className="fin-stat-help">Tổng remaining của các goal</p></CardContent></Card>
      <Card className="fin-card"><CardContent className="p-5"><CircleDollarSign className="size-5 text-emerald-600" /><p className="fin-stat-label">Nhu cầu / tháng</p><p className="fin-stat-value">{formatMinorMoney(totalNeeded, currencyCode, decimalDigits)}</p><p className="fin-stat-help">Để giữ target date hiện tại</p></CardContent></Card>
      <Card className="fin-card"><CardContent className="p-5"><WalletCards className="size-5 text-sky-600" /><p className="fin-stat-label">Nguồn tiền / tháng</p><p className="fin-stat-value">{formatMinorMoney(monthlyAvailable, currencyCode, decimalDigits)}</p><p className="fin-stat-help">{savedReserve > 0 ? "Từ Savings Reserve của Cash Flow Planner" : "Từ free cash baseline hiện tại"}</p></CardContent></Card>
    </div>

    <div className="mt-4"><FinancialGoalsPlanner goals={progress.map((goal) => ({ id: goal.id, name: goal.name, icon_name: goal.icon_name, icon_color: goal.icon_color, remaining_minor: goal.remaining_minor, monthly_needed_minor: goal.monthly_needed_minor, target_date: goal.target_date, status: goal.status }))} currencyCode={currencyCode} decimalDigits={decimalDigits} today={today} defaultMonthlyAvailableMinor={defaultMonthlyAvailable} savedPlan={planData.plan} savedAllocations={planData.allocations} /></div>

    <Card className="mt-4 fin-card"><CardContent className="p-5"><h2 className="font-black">Nguyên tắc của Planner</h2><div className="mt-3 space-y-2 text-xs leading-5 text-[var(--muted-foreground)]"><p>• Planner chỉ lập kế hoạch; không tự tạo Transaction, không thay đổi số dư và không tự ghi Contribution vào Savings Goal.</p><p>• Mặc định nguồn tiền lấy từ Savings Reserve trong Smart Cash Flow Planner. Nếu chưa có kế hoạch tháng, Finzaro dùng free cash baseline làm gợi ý.</p><p>• Strategy “Theo ưu tiên” cấp tiền cho mục tiêu quan trọng trước; “Cân bằng” chia theo nhu cầu hàng tháng của từng goal.</p><p>• Mọi tính toán chỉ chạy trên currency mặc định; Finzaro không tự quy đổi FX.</p></div></CardContent></Card>
  </div>;
}
