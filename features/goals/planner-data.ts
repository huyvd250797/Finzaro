import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type FinancialGoalPlan = {
  id: string;
  user_id: string;
  currency_code: string;
  monthly_available_minor: number;
  strategy: "priority" | "balanced";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FinancialGoalAllocation = {
  id: string;
  user_id: string;
  plan_id: string;
  goal_id: string;
  priority: number;
  monthly_allocation_minor: number;
  created_at: string;
  updated_at: string;
};

export async function loadFinancialGoalPlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  currencyCode: string
) {
  const client = supabase as any;
  const { data: plan, error: planError } = await client
    .from("financial_goal_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("currency_code", currencyCode)
    .maybeSingle();

  if (planError && !String(planError.message ?? "").includes("financial_goal_plans")) throw planError;
  if (!plan) return { plan: null as FinancialGoalPlan | null, allocations: [] as FinancialGoalAllocation[] };

  const { data: allocations, error: allocationError } = await client
    .from("financial_goal_allocations")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_id", plan.id)
    .order("priority", { ascending: true });
  if (allocationError) throw allocationError;

  return {
    plan: plan as FinancialGoalPlan,
    allocations: (allocations ?? []) as FinancialGoalAllocation[]
  };
}
