import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { loadForecastData, type ForecastMonthPoint } from "@/features/forecasting/data";

export type CashFlowPlan = {
  id: string;
  user_id: string;
  month_start: string;
  currency_code: string;
  planned_income_minor: number;
  discretionary_limit_minor: number;
  savings_reserve_minor: number;
  extra_debt_payment_minor: number;
  minimum_cash_buffer_minor: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CashFlowMonth = ForecastMonthPoint & {
  month_start: string;
  opening_balance_minor: number;
  fixed_obligations_minor: number;
  baseline_discretionary_minor: number;
  saved_plan: CashFlowPlan | null;
};

export type CashFlowPlannerData = {
  currency_code: string;
  decimal_digits: number;
  current_liquid_balance_minor: number;
  months: CashFlowMonth[];
  notes: string[];
};

export async function loadCashFlowPlannerData(supabase: SupabaseClient<Database>, userId: string): Promise<CashFlowPlannerData> {
  const forecast = await loadForecastData(supabase, userId);
  const planResult = await (supabase as any)
    .from("cash_flow_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("currency_code", forecast.currency_code)
    .order("month_start", { ascending: true });

  if (planResult.error && !String(planResult.error.message ?? "").includes("cash_flow_plans")) throw planResult.error;
  const plans = (planResult.data ?? []) as CashFlowPlan[];
  const planByMonth = new Map(plans.map((plan) => [plan.month_start.slice(0, 7), plan]));

  let plannedOpeningBalance = forecast.current_liquid_balance_minor;
  const months: CashFlowMonth[] = forecast.points.map((point) => {
    const savedPlan = planByMonth.get(point.key) ?? null;
    const fixedObligations = point.recurring_expense_minor + point.loan_payment_minor + point.credit_card_due_minor;
    const openingBalance = plannedOpeningBalance;
    if (savedPlan) {
      plannedOpeningBalance = openingBalance
        + savedPlan.planned_income_minor
        - fixedObligations
        - savedPlan.discretionary_limit_minor
        - savedPlan.savings_reserve_minor
        - savedPlan.extra_debt_payment_minor;
    } else {
      plannedOpeningBalance = openingBalance + point.net_minor;
    }
    return {
      ...point,
      month_start: `${point.key}-01`,
      opening_balance_minor: openingBalance,
      fixed_obligations_minor: fixedObligations,
      baseline_discretionary_minor: point.variable_expense_minor,
      saved_plan: savedPlan
    };
  });

  return {
    currency_code: forecast.currency_code,
    decimal_digits: forecast.decimal_digits,
    current_liquid_balance_minor: forecast.current_liquid_balance_minor,
    months,
    notes: [
      "Safe to Spend = tiền có thể chi thêm trong tháng sau khi giữ lại nghĩa vụ, reserve, trả nợ thêm và mức đệm tiền mặt tối thiểu.",
      "Planner dùng baseline của Forecasting nhưng kế hoạch lưu tại đây không tự tạo Transaction hoặc thay đổi số dư thực tế.",
      "Finzaro không tự quy đổi ngoại tệ; kế hoạch chạy theo currency mặc định trong Settings."
    ]
  };
}
