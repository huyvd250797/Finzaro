import { AuthMessage } from "@/components/auth-message";
import { DebtStrategyPlanner } from "@/components/debt-strategy-planner";
import { buildStrategyDebts, loadDebtStrategyPlan } from "@/features/debt-strategy/data";
import { loadCreditCards, projectCreditCards } from "@/features/credit-cards/data";
import { loadLoans, loanProjections } from "@/features/loans/data";
import { todayInTimeZone } from "@/features/recurring/data";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chiến lược trả nợ" };
type SearchParams = Promise<{ error?: string; message?: string }>;

export default async function DebtStrategyPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code,timezone").eq("id", userId).maybeSingle();
  const currencyCode = preferences?.currency_code ?? "VND";
  const today = todayInTimeZone(preferences?.timezone ?? "Asia/Ho_Chi_Minh");
  const [loanData, creditData, plan] = await Promise.all([
    loadLoans(supabase, userId, false),
    loadCreditCards(supabase, userId, false),
    loadDebtStrategyPlan(supabase, userId, currencyCode)
  ]);
  const loans = loanProjections(loanData.loans, loanData.payments, loanData.accounts, today);
  const cards = projectCreditCards(creditData.cards, creditData.statements, creditData.payments, creditData.accounts, today);
  const debts = buildStrategyDebts(loans, cards, currencyCode);
  const digits = loanData.currencies.find((item) => item.code === currencyCode)?.decimal_digits ?? creditData.currencies.find((item) => item.code === currencyCode)?.decimal_digits ?? 0;

  return <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
    <div><p className="text-sm font-semibold text-orange-600">Debt Intelligence</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Advanced Debt Strategy</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">So sánh Debt Avalanche và Debt Snowball trên dư nợ Loan + Credit Card hiện tại, mô phỏng tiền trả thêm mỗi tháng và ước tính thứ tự hết nợ.</p></div>
    <AuthMessage error={params.error} message={params.message} />
    <div className="mt-5"><DebtStrategyPlanner debts={debts} currencyCode={currencyCode} decimalDigits={digits} initialExtraMinor={plan?.extra_monthly_minor ?? 0} initialStrategy={plan?.strategy ?? "avalanche"} /></div>
  </div>;
}
