import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type SavingsGoal = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  currency_code: string;
  target_amount_minor: number;
  target_date: string | null;
  linked_account_id: string | null;
  icon_name: string;
  icon_color: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type SavingsGoalEntry = {
  id: string;
  user_id: string;
  goal_id: string;
  entry_type: "contribution" | "withdrawal" | "adjustment";
  amount_minor: number;
  entry_date: string;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
};

export type SavingsGoalAccount = {
  id: string;
  name: string;
  currency_code: string;
  account_type: string;
  is_archived: boolean;
  current_balance_minor: number;
};

export type SavingsGoalProgress = SavingsGoal & {
  saved_minor: number;
  remaining_minor: number;
  percent: number;
  status: "archived" | "completed" | "overdue" | "behind" | "on_track" | "active";
  monthly_needed_minor: number | null;
  estimated_completion_date: string | null;
  linked_account: SavingsGoalAccount | null;
  entries: SavingsGoalEntry[];
};

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function parseUtcDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`);
}

function diffDays(from: string, to: string) {
  return Math.floor((parseUtcDate(to).getTime() - parseUtcDate(from).getTime()) / 86400000);
}

function addDays(value: string, days: number) {
  const date = parseUtcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function savingsGoalProgress(
  goals: SavingsGoal[],
  entries: SavingsGoalEntry[],
  accounts: SavingsGoalAccount[],
  today: string
): SavingsGoalProgress[] {
  const entriesByGoal = new Map<string, SavingsGoalEntry[]>();
  for (const entry of entries) {
    const list = entriesByGoal.get(entry.goal_id) ?? [];
    list.push(entry);
    entriesByGoal.set(entry.goal_id, list);
  }
  const accountById = new Map(accounts.map((account) => [account.id, account]));

  return goals.map((goal) => {
    const goalEntries = (entriesByGoal.get(goal.id) ?? []).sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at));
    const saved = goalEntries.reduce((sum, entry) => sum + entry.amount_minor, 0);
    const remaining = Math.max(0, goal.target_amount_minor - saved);
    const percent = goal.target_amount_minor > 0 ? Math.max(0, Math.round((saved / goal.target_amount_minor) * 1000) / 10) : 0;
    const createdDate = dateOnly(goal.created_at);

    let status: SavingsGoalProgress["status"] = "active";
    if (goal.is_archived) status = "archived";
    else if (saved >= goal.target_amount_minor) status = "completed";
    else if (goal.target_date && goal.target_date < today) status = "overdue";
    else if (goal.target_date) {
      const totalDays = Math.max(1, diffDays(createdDate, goal.target_date));
      const elapsedDays = Math.max(0, Math.min(totalDays, diffDays(createdDate, today)));
      const expected = goal.target_amount_minor * (elapsedDays / totalDays);
      status = saved + goal.target_amount_minor * 0.02 >= expected ? "on_track" : "behind";
    }

    let monthlyNeeded: number | null = null;
    if (goal.target_date && remaining > 0 && goal.target_date >= today) {
      const daysLeft = Math.max(1, diffDays(today, goal.target_date));
      const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30.4375));
      monthlyNeeded = Math.ceil(remaining / monthsLeft);
    }

    let estimatedCompletionDate: string | null = null;
    if (remaining === 0) estimatedCompletionDate = today;
    else {
      const datedEntries = goalEntries.filter((entry) => entry.entry_date <= today);
      if (datedEntries.length >= 2 && saved > 0) {
        const oldest = datedEntries.reduce((min, entry) => entry.entry_date < min ? entry.entry_date : min, datedEntries[0].entry_date);
        const observedDays = Math.max(14, diffDays(oldest, today) + 1);
        const monthlyVelocity = saved / (observedDays / 30.4375);
        if (monthlyVelocity > 0) {
          const monthsNeeded = remaining / monthlyVelocity;
          estimatedCompletionDate = addDays(today, Math.max(1, Math.ceil(monthsNeeded * 30.4375)));
        }
      }
    }

    return {
      ...goal,
      saved_minor: saved,
      remaining_minor: remaining,
      percent,
      status,
      monthly_needed_minor: monthlyNeeded,
      estimated_completion_date: estimatedCompletionDate,
      linked_account: goal.linked_account_id ? accountById.get(goal.linked_account_id) ?? null : null,
      entries: goalEntries
    };
  }).sort((a, b) => {
    if (a.is_archived !== b.is_archived) return a.is_archived ? 1 : -1;
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (b.status === "completed" && a.status !== "completed") return -1;
    return (a.target_date ?? "9999-12-31").localeCompare(b.target_date ?? "9999-12-31") || a.name.localeCompare(b.name, "vi");
  });
}

export async function loadSavingsGoals(supabase: SupabaseClient<Database>, userId: string, includeArchived = false) {
  let goalsQuery = supabase.from("savings_goals").select("*").eq("user_id", userId).order("is_archived").order("target_date", { ascending: true, nullsFirst: false }).order("created_at");
  if (!includeArchived) goalsQuery = goalsQuery.eq("is_archived", false);

  const [{ data: goals, error: goalsError }, { data: entries, error: entriesError }, { data: accounts, error: accountsError }] = await Promise.all([
    goalsQuery,
    supabase.from("savings_goal_entries").select("*").eq("user_id", userId).order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(5000),
    supabase.from("accounts").select("id, name, currency_code, account_type, is_archived, current_balance_minor").eq("user_id", userId)
  ]);

  if (goalsError) throw goalsError;
  if (entriesError) throw entriesError;
  if (accountsError) throw accountsError;

  return {
    goals: (goals ?? []) as SavingsGoal[],
    entries: (entries ?? []) as SavingsGoalEntry[],
    accounts: (accounts ?? []) as SavingsGoalAccount[]
  };
}

export function savingsGoalSummary(progress: SavingsGoalProgress[], currencyCode: string) {
  const active = progress.filter((goal) => !goal.is_archived && goal.currency_code === currencyCode);
  const target = active.reduce((sum, goal) => sum + goal.target_amount_minor, 0);
  const saved = active.reduce((sum, goal) => sum + goal.saved_minor, 0);
  const remaining = Math.max(0, active.reduce((sum, goal) => sum + goal.remaining_minor, 0));
  const completed = active.filter((goal) => goal.status === "completed").length;
  const attention = active.filter((goal) => goal.status === "behind" || goal.status === "overdue").length;
  return {
    count: active.length,
    target,
    saved,
    remaining,
    completed,
    attention,
    percent: target > 0 ? Math.max(0, Math.round((saved / target) * 1000) / 10) : 0
  };
}
