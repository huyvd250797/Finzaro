import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { budgetProgress, budgetSummary, loadBudgets, monthStartFromKey } from "@/features/budgets/data";
import { loadNetWorthData, positionForCurrency } from "@/features/net-worth/data";
import { loadRecurringData, projectRecurringOccurrences, todayInTimeZone } from "@/features/recurring/data";
import { currentMonthKey, loadLedger, monthTotals, sixMonthWindow } from "@/features/transactions/data";

export type FinancialHealthSnapshot = {
  id: string;
  user_id: string;
  snapshot_date: string;
  currency_code: string;
  overall_score: number;
  data_confidence: number;
  cashflow_score: number;
  savings_score: number;
  budget_score: number;
  liquidity_score: number;
  debt_score: number;
  credit_score: number;
  net_worth_score: number;
  metrics: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HealthSubscoreKey = "cashflow" | "savings" | "budget" | "liquidity" | "debt" | "credit" | "net_worth";
export type HealthSubscore = {
  key: HealthSubscoreKey;
  label: string;
  score: number;
  weight: number;
  description: string;
};

export type HealthInsight = {
  tone: "positive" | "warning" | "negative" | "neutral";
  title: string;
  description: string;
  action_label?: string;
  href?: string;
};

export type FinancialHealthResult = {
  currency_code: string;
  currency_decimal_digits: number;
  overall_score: number;
  grade: "Excellent" | "Good" | "Fair" | "Needs attention";
  data_confidence: number;
  subscores: HealthSubscore[];
  insights: HealthInsight[];
  metrics: {
    current_income_minor: number;
    current_expense_minor: number;
    current_net_minor: number;
    savings_rate_percent: number | null;
    average_monthly_income_minor: number;
    average_monthly_expense_minor: number;
    positive_cashflow_months: number;
    observed_months: number;
    budget_allocated_minor: number;
    budget_actual_minor: number;
    budget_over_count: number;
    budget_near_count: number;
    liquidity_months: number | null;
    debt_to_asset_percent: number;
    loan_payment_burden_percent: number | null;
    credit_utilization_percent: number;
    high_utilization_cards: number;
    recurring_commitments_minor: number;
    recurring_commitment_ratio_percent: number | null;
    net_worth_minor: number;
    net_worth_change_percent: number | null;
  };
  position: ReturnType<typeof positionForCurrency>;
  snapshots: FinancialHealthSnapshot[];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const avg = average(values);
  return Math.sqrt(average(values.map((value) => (value - avg) ** 2)));
}

function scoreSavingsRate(rate: number | null) {
  if (rate === null) return 45;
  if (rate >= 25) return 100;
  if (rate >= 20) return 92;
  if (rate >= 15) return 82;
  if (rate >= 10) return 70;
  if (rate >= 5) return 58;
  if (rate >= 0) return 42;
  if (rate >= -10) return 22;
  return 8;
}

function scoreLiquidity(months: number | null) {
  if (months === null) return 55;
  if (months >= 6) return 100;
  if (months >= 4) return 90;
  if (months >= 3) return 80;
  if (months >= 2) return 67;
  if (months >= 1) return 50;
  if (months > 0) return 30;
  return 10;
}

function scoreDebtRatio(ratio: number) {
  if (ratio <= 15) return 100;
  if (ratio <= 25) return 92;
  if (ratio <= 35) return 82;
  if (ratio <= 50) return 65;
  if (ratio <= 65) return 42;
  if (ratio <= 80) return 25;
  return 10;
}

function scoreCreditUtilization(utilization: number, overdueCount: number) {
  let score = utilization <= 10 ? 100 : utilization <= 30 ? 95 : utilization <= 50 ? 78 : utilization <= 70 ? 55 : utilization <= 90 ? 30 : 15;
  score -= overdueCount * 15;
  return clamp(score);
}

function gradeFor(score: number): FinancialHealthResult["grade"] {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  return "Needs attention";
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? (numerator / denominator) * 100 : null;
}

export async function loadFinancialHealthData(supabase: SupabaseClient<Database>, userId: string): Promise<FinancialHealthResult> {
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const currencyCode = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const today = todayInTimeZone(timeZone);
  const currentMonth = currentMonthKey(timeZone);
  const months = sixMonthWindow(timeZone);
  const fromDate = `${months[0]?.key ?? currentMonth}-01`;

  const [ledger, budgets, positionData, recurring, healthSnapshotResult] = await Promise.all([
    loadLedger(supabase, userId, { fromDate, limit: 5000 }),
    loadBudgets(supabase, userId, monthStartFromKey(currentMonth), false),
    loadNetWorthData(supabase, userId, today),
    loadRecurringData(supabase, userId),
    (supabase as any).from("financial_health_snapshots").select("*").eq("user_id", userId).eq("currency_code", currencyCode).order("snapshot_date", { ascending: true }).limit(180)
  ]);

  const position = positionForCurrency(positionData.summaries, currencyCode);
  const currentTotals = monthTotals(ledger.transactions, currencyCode, currentMonth);
  const monthly = months.map((month) => ({ month: month.key, ...monthTotals(ledger.transactions, currencyCode, month.key) }));
  const activeMonths = monthly.filter((row) => row.income > 0 || row.expense > 0);
  const incomeValues = activeMonths.map((row) => row.income);
  const expenseValues = activeMonths.map((row) => row.expense);
  const avgIncome = Math.round(average(incomeValues));
  const avgExpense = Math.round(average(expenseValues));
  const positiveMonths = activeMonths.filter((row) => row.net >= 0).length;

  const savingsRate = currentTotals.income > 0 ? ((currentTotals.income - currentTotals.expense) / currentTotals.income) * 100 : null;

  const budgetRows = budgetProgress(budgets, ledger.transactions, ledger.categories);
  const budgetState = budgetSummary(budgetRows, currencyCode);

  const expenseVolatility = avgExpense > 0 ? standardDeviation(expenseValues) / avgExpense : 0;
  const positiveRatio = activeMonths.length > 0 ? positiveMonths / activeMonths.length : 0.5;
  const cashflowScore = clamp(positiveRatio * 70 + Math.max(0, 1 - expenseVolatility) * 30);
  const savingsScore = scoreSavingsRate(savingsRate);

  let budgetScore = 55;
  if (budgetState.count > 0) {
    const usageRatio = budgetState.allocated > 0 ? budgetState.actual / budgetState.allocated : 0;
    budgetScore = 100 - budgetState.overCount * 24 - budgetState.nearCount * 9 - Math.max(0, usageRatio - 1) * 35;
    if (usageRatio < 0.5 && budgetState.overCount === 0) budgetScore = Math.max(budgetScore, 88);
    budgetScore = clamp(budgetScore);
  }

  const liquidityMonths = avgExpense > 0 ? position.liquid_assets_minor / avgExpense : position.liquid_assets_minor > 0 ? 12 : null;
  const liquidityScore = scoreLiquidity(liquidityMonths);

  const activeLoans = positionData.loans.filter((loan) => !loan.is_archived && loan.currency_code === currencyCode && loan.remaining_principal_minor > 0);
  const scheduledLoanPayments = activeLoans.reduce((sum, loan) => sum + loan.next_scheduled_payment_minor, 0);
  const incomeBase = currentTotals.income > 0 ? currentTotals.income : avgIncome;
  const loanBurden = ratio(scheduledLoanPayments, incomeBase);
  const rawDebtScore = scoreDebtRatio(position.debt_to_asset_percent);
  const loanBurdenScore = loanBurden === null ? 75 : loanBurden <= 15 ? 100 : loanBurden <= 25 ? 80 : loanBurden <= 35 ? 58 : loanBurden <= 50 ? 35 : 15;
  const debtScore = clamp(rawDebtScore * 0.72 + loanBurdenScore * 0.28);

  const cards = positionData.cards.filter((card) => !card.is_archived && card.currency_code === currencyCode);
  const totalLimit = cards.reduce((sum, card) => sum + card.credit_limit_minor, 0);
  const totalCardBalance = cards.reduce((sum, card) => sum + card.current_balance_minor, 0);
  const utilization = totalLimit > 0 ? (totalCardBalance / totalLimit) * 100 : 0;
  const overdueStatements = cards.filter((card) => card.latest_statement?.status === "overdue").length;
  const creditScore = cards.length > 0 ? scoreCreditUtilization(utilization, overdueStatements) : 100;

  const positionSnapshots = positionData.snapshots.filter((snapshot) => snapshot.currency_code === currencyCode).sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
  const previousPosition = positionSnapshots.at(-1) ?? null;
  const netWorthChange = previousPosition && previousPosition.net_worth_minor !== 0
    ? ((position.net_worth_minor - previousPosition.net_worth_minor) / Math.abs(previousPosition.net_worth_minor)) * 100
    : null;
  const netWorthScore = netWorthChange === null ? 65 : netWorthChange >= 5 ? 100 : netWorthChange >= 0 ? 82 : netWorthChange >= -5 ? 55 : netWorthChange >= -10 ? 35 : 18;

  const next30 = new Date(`${today}T00:00:00Z`);
  next30.setUTCDate(next30.getUTCDate() + 30);
  const recurringProjected = projectRecurringOccurrences(
    recurring.rules.filter((rule) => rule.is_active && rule.transaction_type === "expense"),
    recurring.occurrences,
    today,
    next30.toISOString().slice(0, 10),
    today
  );
  const recurringCommitments = recurringProjected.reduce((sum, occurrence) => {
    const rule = occurrence.rule;
    if (occurrence.status === "paid" || occurrence.status === "skipped") return sum;
    if (!rule.from_account_id || !rule.from_amount_minor) return sum;
    const account = ledger.accounts.find((item) => item.id === rule.from_account_id);
    if (!account || account.currency_code !== currencyCode) return sum;
    return sum + Math.abs(rule.from_amount_minor);
  }, 0);
  const commitmentRatio = ratio(recurringCommitments, incomeBase);

  const subscores: HealthSubscore[] = [
    { key: "cashflow", label: "Dòng tiền", score: cashflowScore, weight: 20, description: `${positiveMonths}/${Math.max(1, activeMonths.length)} tháng gần đây có dòng tiền ròng không âm.` },
    { key: "savings", label: "Tiết kiệm", score: savingsScore, weight: 15, description: savingsRate === null ? "Chưa đủ thu nhập trong tháng để tính savings rate." : `Savings rate tháng hiện tại ${Math.round(savingsRate * 10) / 10}%.` },
    { key: "budget", label: "Kỷ luật ngân sách", score: budgetScore, weight: 15, description: budgetState.count > 0 ? `${budgetState.overCount} budget vượt và ${budgetState.nearCount} budget gần chạm hạn mức.` : "Chưa có ngân sách tháng hiện tại; điểm ở mức trung tính." },
    { key: "liquidity", label: "Thanh khoản", score: liquidityScore, weight: 20, description: liquidityMonths === null ? "Chưa đủ dữ liệu chi tiêu để tính số tháng dự phòng." : `Tài sản thanh khoản tương đương khoảng ${Math.round(liquidityMonths * 10) / 10} tháng chi tiêu.` },
    { key: "debt", label: "Sức khỏe nợ", score: debtScore, weight: 15, description: `Debt/Assets ${position.debt_to_asset_percent}%${loanBurden === null ? "" : ` · nghĩa vụ trả vay khoảng ${Math.round(loanBurden * 10) / 10}% thu nhập`}.` },
    { key: "credit", label: "Tín dụng", score: creditScore, weight: 10, description: cards.length > 0 ? `Credit utilization tổng hợp ${Math.round(utilization * 10) / 10}%${overdueStatements > 0 ? ` · ${overdueStatements} sao kê quá hạn` : ""}.` : "Không có thẻ tín dụng đang hoạt động." },
    { key: "net_worth", label: "Xu hướng tài sản ròng", score: clamp(netWorthScore), weight: 5, description: netWorthChange === null ? "Cần thêm snapshot để đánh giá xu hướng tài sản ròng." : `Net Worth thay đổi ${netWorthChange >= 0 ? "+" : ""}${Math.round(netWorthChange * 10) / 10}% so với snapshot gần nhất.` }
  ];

  const overallScore = clamp(subscores.reduce((sum, item) => sum + item.score * item.weight, 0) / 100);

  const confidence = clamp(
    Math.min(40, activeMonths.length * 7) +
    (ledger.accounts.length > 0 ? 15 : 0) +
    (budgetState.count > 0 ? 10 : 0) +
    (position.total_assets_minor !== 0 || position.total_liabilities_minor !== 0 ? 15 : 0) +
    (positionSnapshots.length > 0 ? 10 : 0) +
    (recurring.rules.length > 0 ? 10 : 0)
  );

  const insights: HealthInsight[] = [];
  if (currentTotals.net < 0) insights.push({ tone: "negative", title: "Dòng tiền tháng này đang âm", description: `Chi tiêu đang cao hơn thu nhập trong ${currencyCode}. Ưu tiên rà lại các nhóm chi lớn và khoản định kỳ.`, action_label: "Mở báo cáo", href: "/reports" });
  else if (savingsRate !== null && savingsRate >= 20) insights.push({ tone: "positive", title: "Savings rate đang ở vùng tốt", description: `Bạn đang giữ lại khoảng ${Math.round(savingsRate * 10) / 10}% thu nhập tháng này.`, action_label: "Mở mục tiêu", href: "/goals" });
  else if (savingsRate !== null && savingsRate < 10) insights.push({ tone: "warning", title: "Dư địa tiết kiệm còn thấp", description: `Savings rate hiện khoảng ${Math.round(savingsRate * 10) / 10}%. Có thể bắt đầu bằng giảm một nhóm chi không thiết yếu hoặc tăng đóng góp mục tiêu.`, action_label: "Xem ngân sách", href: "/budgets" });

  if (liquidityMonths !== null && liquidityMonths < 3) insights.push({ tone: liquidityMonths < 1 ? "negative" : "warning", title: "Quỹ thanh khoản còn mỏng", description: `Tài sản thanh khoản hiện tương đương khoảng ${Math.round(liquidityMonths * 10) / 10} tháng chi tiêu; mốc 3–6 tháng sẽ tạo vùng đệm tốt hơn.`, action_label: "Tạo mục tiêu dự phòng", href: "/goals" });
  else if (liquidityMonths !== null && liquidityMonths >= 6) insights.push({ tone: "positive", title: "Vùng đệm thanh khoản tốt", description: `Tài sản thanh khoản đang bao phủ khoảng ${Math.round(liquidityMonths * 10) / 10} tháng chi tiêu trung bình.` });

  if (position.debt_to_asset_percent > 50) insights.push({ tone: "negative", title: "Tỷ trọng nợ đang cao", description: `Nợ tương đương ${position.debt_to_asset_percent}% tổng tài sản. Nên ưu tiên các khoản lãi cao hoặc có kỳ thanh toán gần.`, action_label: "Mở khoản vay", href: "/loans" });
  if (loanBurden !== null && loanBurden > 35) insights.push({ tone: "warning", title: "Nghĩa vụ trả vay chiếm tỷ trọng lớn", description: `Khoản trả vay dự kiến tương đương khoảng ${Math.round(loanBurden * 10) / 10}% thu nhập tháng tham chiếu.`, action_label: "Mô phỏng trả nợ", href: "/loans" });

  if (utilization >= 80) insights.push({ tone: "negative", title: "Credit utilization rất cao", description: `Tổng utilization đang ở ${Math.round(utilization * 10) / 10}%. Giảm dư nợ thẻ sẽ cải thiện đáng kể điểm tín dụng nội bộ của Finzaro.`, action_label: "Mở thẻ tín dụng", href: "/credit-cards" });
  else if (utilization >= 50) insights.push({ tone: "warning", title: "Credit utilization cần chú ý", description: `Tổng utilization đang ở ${Math.round(utilization * 10) / 10}%.`, action_label: "Mở thẻ tín dụng", href: "/credit-cards" });

  if (budgetState.overCount > 0) insights.push({ tone: "warning", title: `${budgetState.overCount} ngân sách đang vượt hạn mức`, description: "Các category vượt budget đang kéo giảm điểm kỷ luật ngân sách.", action_label: "Mở Budget Engine", href: "/budgets" });
  if (commitmentRatio !== null && commitmentRatio > 45) insights.push({ tone: "warning", title: "Chi phí định kỳ đang chiếm tỷ trọng lớn", description: `Các recurring expense 30 ngày tới tương đương khoảng ${Math.round(commitmentRatio * 10) / 10}% thu nhập tham chiếu.`, action_label: "Mở lịch tài chính", href: "/recurring" });
  if (netWorthChange !== null && netWorthChange >= 3) insights.push({ tone: "positive", title: "Net Worth đang tăng", description: `Tài sản ròng tăng khoảng ${Math.round(netWorthChange * 10) / 10}% so với snapshot gần nhất.`, action_label: "Mở tài sản ròng", href: "/net-worth" });
  if (insights.length === 0) insights.push({ tone: "neutral", title: "Cần thêm dữ liệu để tạo insight mạnh hơn", description: "Tiếp tục ghi giao dịch, ngân sách, khoản vay và snapshot Net Worth để Finzaro tăng độ tin cậy của phân tích." });

  const missingSnapshotTable = healthSnapshotResult.error && ["42P01", "PGRST205"].includes(String(healthSnapshotResult.error.code));
  const healthSnapshots = missingSnapshotTable ? [] : ((healthSnapshotResult.data ?? []) as FinancialHealthSnapshot[]);
  if (healthSnapshotResult.error && !missingSnapshotTable) throw healthSnapshotResult.error;

  return {
    currency_code: currencyCode,
    currency_decimal_digits: positionData.currencies.find((currency) => currency.code === currencyCode)?.decimal_digits ?? 0,
    overall_score: overallScore,
    grade: gradeFor(overallScore),
    data_confidence: confidence,
    subscores,
    insights: insights.slice(0, 8),
    metrics: {
      current_income_minor: currentTotals.income,
      current_expense_minor: currentTotals.expense,
      current_net_minor: currentTotals.net,
      savings_rate_percent: savingsRate === null ? null : Math.round(savingsRate * 10) / 10,
      average_monthly_income_minor: avgIncome,
      average_monthly_expense_minor: avgExpense,
      positive_cashflow_months: positiveMonths,
      observed_months: activeMonths.length,
      budget_allocated_minor: budgetState.allocated,
      budget_actual_minor: budgetState.actual,
      budget_over_count: budgetState.overCount,
      budget_near_count: budgetState.nearCount,
      liquidity_months: liquidityMonths === null ? null : Math.round(liquidityMonths * 10) / 10,
      debt_to_asset_percent: position.debt_to_asset_percent,
      loan_payment_burden_percent: loanBurden === null ? null : Math.round(loanBurden * 10) / 10,
      credit_utilization_percent: Math.round(utilization * 10) / 10,
      high_utilization_cards: cards.filter((card) => card.alert_level === "high").length,
      recurring_commitments_minor: recurringCommitments,
      recurring_commitment_ratio_percent: commitmentRatio === null ? null : Math.round(commitmentRatio * 10) / 10,
      net_worth_minor: position.net_worth_minor,
      net_worth_change_percent: netWorthChange === null ? null : Math.round(netWorthChange * 10) / 10
    },
    position,
    snapshots: healthSnapshots
  };
}
