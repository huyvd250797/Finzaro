import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type RecurringRule = {
  id: string;
  user_id: string;
  transaction_type: "income" | "expense" | "transfer";
  title: string;
  category_id: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  from_amount_minor: number | null;
  to_amount_minor: number | null;
  notes: string | null;
  frequency: "weekly" | "monthly" | "yearly";
  interval_count: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RecurringOccurrence = {
  id: string;
  user_id: string;
  recurring_rule_id: string;
  due_date: string;
  status: "paid" | "skipped";
  transaction_id: string | null;
  completed_at: string;
  created_at: string;
};

export type RecurringProjectedOccurrence = {
  key: string;
  rule: RecurringRule;
  dueDate: string;
  status: "upcoming" | "due" | "overdue" | "paid" | "skipped";
  occurrence: RecurringOccurrence | null;
};

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addMonthsClamped(start: Date, months: number, anchorDay: number) {
  const base = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1));
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), Math.min(anchorDay, daysInMonth(base.getUTCFullYear(), base.getUTCMonth()))));
}

function addYearsClamped(start: Date, years: number, monthIndex: number, anchorDay: number) {
  const year = start.getUTCFullYear() + years;
  return new Date(Date.UTC(year, monthIndex, Math.min(anchorDay, daysInMonth(year, monthIndex))));
}

export function projectRecurringOccurrences(
  rules: RecurringRule[],
  occurrences: RecurringOccurrence[],
  rangeStart: string,
  rangeEnd: string,
  today: string
) {
  const startBoundary = parseDate(rangeStart);
  const endBoundary = parseDate(rangeEnd);
  const occurrenceMap = new Map(occurrences.map((item) => [`${item.recurring_rule_id}:${item.due_date}`, item]));
  const projected: RecurringProjectedOccurrence[] = [];

  for (const rule of rules) {
    const start = parseDate(rule.start_date);
    const end = rule.end_date ? parseDate(rule.end_date) : null;
    const anchorDay = start.getUTCDate();
    const anchorMonth = start.getUTCMonth();
    let index = 0;
    let cursor = start;

    while (cursor <= endBoundary && index < 520) {
      if (cursor >= startBoundary && (!end || cursor <= end)) {
        const dueDate = formatDate(cursor);
        const completion = occurrenceMap.get(`${rule.id}:${dueDate}`) ?? null;
        const status = completion?.status ?? (dueDate < today ? "overdue" : dueDate === today ? "due" : "upcoming");
        projected.push({ key: `${rule.id}:${dueDate}`, rule, dueDate, status, occurrence: completion });
      }

      index += 1;
      if (rule.frequency === "weekly") {
        cursor = new Date(start.getTime() + index * rule.interval_count * 7 * 86400000);
      } else if (rule.frequency === "monthly") {
        cursor = addMonthsClamped(start, index * rule.interval_count, anchorDay);
      } else {
        cursor = addYearsClamped(start, index * rule.interval_count, anchorMonth, anchorDay);
      }
      if (end && cursor > end) break;
    }
  }

  return projected.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.rule.title.localeCompare(b.rule.title, "vi"));
}

export function monthBounds(monthKey: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${year}-${String(month).padStart(2, "0")}-01`, end: `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}` };
}

export function shiftMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthDisplay(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function todayInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function loadRecurringData(supabase: SupabaseClient<Database>, userId: string) {
  const [{ data: rules, error: rulesError }, { data: occurrences, error: occurrencesError }] = await Promise.all([
    supabase.from("recurring_rules").select("*").eq("user_id", userId).order("is_active", { ascending: false }).order("start_date"),
    supabase.from("recurring_occurrences").select("*").eq("user_id", userId).order("due_date", { ascending: false }).limit(2000)
  ]);
  if (rulesError) throw rulesError;
  if (occurrencesError) throw occurrencesError;
  return { rules: (rules ?? []) as RecurringRule[], occurrences: (occurrences ?? []) as RecurringOccurrence[] };
}
