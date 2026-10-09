import Link from "next/link";
import { AlertTriangle, Archive, CalendarDays, CheckCircle2, ChevronRight, Clock3, CreditCard, Landmark, Pencil, ReceiptText, RotateCcw, ShieldCheck, TrendingDown, WalletCards, X } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { CategoryIconPicker } from "@/components/category-icon-picker";
import { InstantReveal } from "@/components/instant-reveal";
import { LoanSimulator } from "@/components/loan-simulator";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { DecimalInput } from "@/components/decimal-input";
import { MoneyCalculatorInput } from "@/components/money-calculator-input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { minorToMajorInput } from "@/features/accounts/money";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { addLoanPaymentAction, createLoanAction, deleteLoanPaymentAction, setLoanArchivedAction, updateLoanAction } from "@/features/loans/actions";
import { addMonthsClamped, loanProjections, loanSummary, loadLoans, type Loan, type LoanCurrency, type LoanProjection } from "@/features/loans/data";
import { loadLedger } from "@/features/transactions/data";
import { todayInTimeZone } from "@/features/recurring/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Khoản vay & dư nợ" };

type SearchParams = Promise<{ show?: string; view?: string; error?: string; message?: string }>;

const METHOD_LABELS = {
  annuity: "Trả góp đều (annuity)",
  equal_principal: "Gốc đều · lãi giảm dần",
  interest_only: "Chỉ trả lãi · gốc cuối kỳ"
} as const;

const FREQUENCY_LABELS = {
  monthly: "Hàng tháng",
  biweekly: "Mỗi 2 tuần",
  weekly: "Hàng tuần"
} as const;

function currencyMeta(currencies: LoanCurrency[], code: string) {
  return currencies.find((currency) => currency.code === code) ?? { code, name: code, symbol: code, decimal_digits: 0 };
}
function viDate(value: string | null) { return value ? value.split("-").reverse().join("/") : "—"; }
function statusMeta(row: LoanProjection) {
  if (row.status === "archived") return { label: "Đã lưu trữ", className: "bg-[var(--muted)] text-[var(--muted-foreground)]", Icon: Archive };
  if (row.status === "paid_off") return { label: "Đã tất toán", className: "bg-emerald-500/10 text-emerald-600", Icon: CheckCircle2 };
  if (row.status === "overdue") return { label: "Quá hạn", className: "bg-rose-500/10 text-rose-600", Icon: AlertTriangle };
  if (row.status === "due_soon") return { label: "Sắp đến hạn", className: "bg-amber-500/10 text-amber-600", Icon: Clock3 };
  return { label: "Đang hoạt động", className: "bg-sky-500/10 text-sky-600", Icon: ShieldCheck };
}

function LoanForm({ currencies, accounts, today, editing }: { currencies: LoanCurrency[]; accounts: Array<{ id: string; name: string; currency_code: string; is_archived: boolean }>; today: string; editing?: Loan }) {
  const action = editing ? updateLoanAction : createLoanAction;
  const selectedCurrency = editing?.currency_code ?? "VND";
  const digits = currencyMeta(currencies, selectedCurrency).decimal_digits;
  const eligibleAccounts = accounts.filter((account) => !account.is_archived && (!editing || account.currency_code === editing.currency_code));
  const nextMonth = addMonthsClamped(today, 1);

  return (
    <Card className="border-emerald-500/25">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">Loan & Debt</p><h2 className="mt-1 text-lg font-black">{editing ? "Cập nhật khoản vay" : "Thêm khoản vay"}</h2><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Dư nợ chỉ giảm khi ghi nhận principal payment. Account balance chỉ thay đổi qua Transaction Core.</p></div>
          <Link href="/loans" data-instant-close aria-label="Đóng" className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)]"><X className="size-4" /></Link>
        </div>
        <form action={action} className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
          {editing && <input type="hidden" name="loan_id" value={editing.id} />}
          <label className="min-w-0 md:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tên khoản vay</span><input name="name" required maxLength={120} defaultValue={editing?.name ?? ""} placeholder="VD: Vay mua xe" className="h-11 w-full max-w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)]" /></label>
          <label className="min-w-0"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Ngân hàng / bên cho vay</span><input name="lender_name" maxLength={120} defaultValue={editing?.lender_name ?? ""} placeholder="VD: Vietcombank" className="h-11 w-full max-w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)]" /></label>
          <label className="min-w-0"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tiền tệ</span>{editing ? <div className="flex h-11 min-w-0 items-center rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 text-sm font-bold">{editing.currency_code}<span className="ml-2 truncate text-[11px] font-normal text-[var(--muted-foreground)]">· khóa sau khi tạo</span></div> : <select name="currency_code" defaultValue="VND" className="h-11 w-full max-w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm">{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} · {currency.name}</option>)}</select>}</label>
          <label className="min-w-0"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Số tiền vay</span><MoneyCalculatorInput name="original_principal" required defaultValue={editing ? minorToMajorInput(editing.original_principal_minor, digits) : ""} decimalDigits={digits} currencyCode={code} placeholder="500000000" /></label>
          <label className="min-w-0"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Lãi suất năm (%)</span><DecimalInput name="annual_rate_percent" required defaultValue={editing?.annual_rate_percent ?? "8.5"} min={0} max={100} maxDecimals={4} placeholder="8.5" /></label>
          <label className="min-w-0"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Thời hạn (tháng)</span><input name="term_months" type="number" min={1} max={600} inputMode="numeric" required defaultValue={editing?.term_months ?? 60} className="h-11 w-full max-w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)]" /></label>
          <label className="min-w-0"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Phí ban đầu</span><MoneyCalculatorInput name="upfront_fee" defaultValue={editing ? minorToMajorInput(editing.upfront_fee_minor, digits) : "0"} decimalDigits={digits} currencyCode={code} /></label>
          <label className="min-w-0"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Ngày bắt đầu</span><input name="start_date" type="date" required defaultValue={editing?.start_date ?? today} className="h-11 w-full max-w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" /></label>
          <label className="min-w-0"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Ngày trả kỳ đầu</span><input name="first_payment_date" type="date" required defaultValue={editing?.first_payment_date ?? nextMonth} className="h-11 w-full max-w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" /></label>
          <label className="min-w-0"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Phương thức trả</span><select name="interest_method" defaultValue={editing?.interest_method ?? "annuity"} className="h-11 w-full max-w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="annuity">Trả góp đều (annuity)</option><option value="equal_principal">Gốc đều · lãi giảm dần</option><option value="interest_only">Chỉ trả lãi · gốc cuối kỳ</option></select></label>
          <label className="min-w-0"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tần suất thanh toán</span><select name="payment_frequency" defaultValue={editing?.payment_frequency ?? "monthly"} className="h-11 w-full max-w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="monthly">Hàng tháng</option><option value="biweekly">Mỗi 2 tuần</option><option value="weekly">Hàng tuần</option></select></label>
          <label className="min-w-0"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tài khoản trả nợ</span><select name="linked_account_id" defaultValue={editing?.linked_account_id ?? ""} className="h-11 w-full max-w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="">Không liên kết</option>{eligibleAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select></label>
          <label className="min-w-0 md:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Ghi chú</span><textarea name="notes" rows={3} maxLength={1000} defaultValue={editing?.notes ?? ""} className="w-full max-w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--primary)]" placeholder="Điều khoản, ưu đãi, bảo hiểm khoản vay..." /></label>
          <div className="min-w-0 md:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Icon & màu</span><CategoryIconPicker defaultValue={editing?.icon_name ?? "CreditCard"} defaultColor={editing?.icon_color ?? "cobalt"} /></div>
          <div className="flex min-w-0 flex-wrap gap-2 md:col-span-2"><PendingSubmitButton idleLabel={editing ? "Lưu khoản vay" : "Tạo khoản vay"} pendingLabel={editing ? "Đang lưu..." : "Đang tạo khoản vay..."} className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-black text-white" /><Link href="/loans" data-instant-close className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] px-4 text-sm font-bold">Hủy</Link></div>
        </form>
      </CardContent>
    </Card>
  );
}

function PaymentForm({ loan, today, digits, transactions }: { loan: LoanProjection; today: string; digits: number; transactions: Array<{ id: string; transaction_type: string; transaction_date: string; title: string; entries: Array<{ amount_minor: number; currency_code: string; account_id: string }> }> }) {
  const next = loan.schedule[Math.min(loan.payments.length, Math.max(0, loan.schedule.length - 1))];
  const candidateTransactions = transactions.filter((transaction) => transaction.entries.some((entry) => entry.currency_code === loan.currency_code && entry.amount_minor < 0 && (!loan.linked_account_id || entry.account_id === loan.linked_account_id))).slice(0, 40);
  return (
    <Card className="border-sky-500/20">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Payment</p><h3 className="mt-1 font-black">Ghi nhận thanh toán</h3><p className="mt-1 text-[11px] leading-5 text-[var(--muted-foreground)]">Tách principal / interest / fee để dư nợ và chi phí vay được tính đúng.</p></div></div>
        <form action={addLoanPaymentAction} className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
          <input type="hidden" name="loan_id" value={loan.id} />
          <label className="min-w-0"><span className="mb-1.5 block text-[10px] font-black uppercase text-[var(--muted-foreground)]">Ngày thanh toán</span><input name="payment_date" type="date" required defaultValue={today} className="h-11 w-full max-w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" /></label>
          <label className="min-w-0"><span className="mb-1.5 block text-[10px] font-black uppercase text-[var(--muted-foreground)]">Principal</span><MoneyCalculatorInput name="principal" required defaultValue={next ? minorToMajorInput(Math.min(next.principal_minor, loan.remaining_principal_minor), digits) : "0"} decimalDigits={digits} currencyCode={loan.currency_code} /></label>
          <label className="min-w-0"><span className="mb-1.5 block text-[10px] font-black uppercase text-[var(--muted-foreground)]">Interest</span><MoneyCalculatorInput name="interest" required defaultValue={next ? minorToMajorInput(next.interest_minor, digits) : "0"} decimalDigits={digits} currencyCode={loan.currency_code} /></label>
          <label className="min-w-0"><span className="mb-1.5 block text-[10px] font-black uppercase text-[var(--muted-foreground)]">Fee</span><MoneyCalculatorInput name="fee" defaultValue="0" decimalDigits={digits} currencyCode={loan.currency_code} /></label>
          <label className="min-w-0 sm:col-span-2"><span className="mb-1.5 block text-[10px] font-black uppercase text-[var(--muted-foreground)]">Liên kết giao dịch <span className="normal-case font-medium">(không bắt buộc)</span></span><select name="transaction_id" defaultValue="" className="h-11 w-full max-w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="">Không liên kết</option>{candidateTransactions.map((transaction) => <option key={transaction.id} value={transaction.id}>{viDate(transaction.transaction_date)} · {transaction.title || transaction.transaction_type}</option>)}</select></label>
          <label className="min-w-0 sm:col-span-2"><span className="mb-1.5 block text-[10px] font-black uppercase text-[var(--muted-foreground)]">Ghi chú</span><input name="notes" maxLength={500} className="h-11 w-full max-w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" /></label>
          <div className="sm:col-span-2"><PendingSubmitButton idleLabel="Ghi nhận thanh toán" pendingLabel="Đang ghi nhận..." className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-black text-white" /></div>
        </form>
      </CardContent>
    </Card>
  );
}

function LoanDetail({ loan, digits, today, transactions }: { loan: LoanProjection; digits: number; today: string; transactions: Parameters<typeof PaymentForm>[0]["transactions"] }) {
  const schedulePreview = loan.schedule.length > 120 ? [...loan.schedule.slice(0, 119), loan.schedule[loan.schedule.length - 1]] : loan.schedule;
  return (
    <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[1.2fr_.8fr]">
      <Card>
        <CardHeader><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">Amortization</p><h2 className="mt-1 text-lg font-black">Lịch trả nợ dự kiến</h2></div><Link href="/loans" className="text-xs font-bold text-[var(--primary)]">Đóng chi tiết</Link></CardHeader>
        <CardContent className="min-w-0">
          <div className="space-y-2 sm:hidden">
            {schedulePreview.map((row) => <div key={row.installment} className="rounded-xl border border-[var(--border)] p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-black">Kỳ {row.installment} · {viDate(row.due_date)}</span><span className="text-xs font-black">{formatMinorMoney(row.payment_minor, loan.currency_code, digits)}</span></div><div className="mt-2 grid grid-cols-3 gap-2 text-[10px]"><div><p className="text-[var(--muted-foreground)]">Gốc</p><p className="mt-0.5 break-words font-bold">{formatMinorMoney(row.principal_minor, loan.currency_code, digits)}</p></div><div><p className="text-[var(--muted-foreground)]">Lãi</p><p className="mt-0.5 break-words font-bold">{formatMinorMoney(row.interest_minor, loan.currency_code, digits)}</p></div><div><p className="text-[var(--muted-foreground)]">Dư nợ</p><p className="mt-0.5 break-words font-bold">{formatMinorMoney(row.remaining_minor, loan.currency_code, digits)}</p></div></div></div>)}
          </div>
          <div className="hidden overflow-hidden rounded-xl border border-[var(--border)] sm:block">
            <table className="w-full text-left text-xs"><thead className="bg-[var(--muted)] text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]"><tr><th className="px-3 py-2.5">Kỳ</th><th className="px-3 py-2.5">Ngày</th><th className="px-3 py-2.5">Gốc</th><th className="px-3 py-2.5">Lãi</th><th className="px-3 py-2.5">Tổng</th><th className="px-3 py-2.5">Dư nợ</th></tr></thead><tbody>{schedulePreview.map((row) => <tr key={row.installment} className="border-t border-[var(--border)]"><td className="px-3 py-2.5 font-black">{row.installment}</td><td className="px-3 py-2.5">{viDate(row.due_date)}</td><td className="px-3 py-2.5">{formatMinorMoney(row.principal_minor, loan.currency_code, digits)}</td><td className="px-3 py-2.5">{formatMinorMoney(row.interest_minor, loan.currency_code, digits)}</td><td className="px-3 py-2.5 font-black">{formatMinorMoney(row.payment_minor, loan.currency_code, digits)}</td><td className="px-3 py-2.5">{formatMinorMoney(row.remaining_minor, loan.currency_code, digits)}</td></tr>)}</tbody></table>
          </div>
          {loan.schedule.length > schedulePreview.length && <p className="mt-3 text-[11px] text-[var(--muted-foreground)]">Lịch có {loan.schedule.length} kỳ. Finzaro hiển thị 119 kỳ đầu và kỳ cuối để giữ giao diện nhẹ; các phép tính vẫn dùng toàn bộ lịch.</p>}
        </CardContent>
      </Card>
      <div className="min-w-0 space-y-4">
        <LoanSimulator principalMinor={loan.original_principal_minor} annualRatePercent={Number(loan.annual_rate_percent)} termMonths={loan.term_months} interestMethod={loan.interest_method} paymentFrequency={loan.payment_frequency} currencyCode={loan.currency_code} decimalDigits={digits} />
        {!loan.is_archived && loan.remaining_principal_minor > 0 && <PaymentForm loan={loan} today={today} digits={digits} transactions={transactions} />}
        <Card><CardHeader><div><h3 className="font-black">Lịch sử thanh toán</h3><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{loan.payments.length} giao dịch đã ghi nhận</p></div></CardHeader><CardContent className="space-y-2">{loan.payments.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] p-5 text-center text-xs text-[var(--muted-foreground)]">Chưa có thanh toán.</div> : loan.payments.map((payment) => <div key={payment.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--border)] p-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><ReceiptText className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-black">{viDate(payment.payment_date)} · {formatMinorMoney(payment.principal_minor + payment.interest_minor + payment.fee_minor, loan.currency_code, digits)}</p><p className="mt-0.5 truncate text-[10px] text-[var(--muted-foreground)]">Gốc {formatMinorMoney(payment.principal_minor, loan.currency_code, digits)} · Lãi {formatMinorMoney(payment.interest_minor, loan.currency_code, digits)}{payment.fee_minor ? ` · Phí ${formatMinorMoney(payment.fee_minor, loan.currency_code, digits)}` : ""}</p></div><form action={deleteLoanPaymentAction}><input type="hidden" name="payment_id" value={payment.id} /><button type="submit" title="Xóa" className="grid size-8 place-items-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]"><X className="size-3.5" /></button></form></div>)}</CardContent></Card>
      </div>
    </div>
  );
}

export default async function LoansPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const defaultCurrency = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const today = todayInTimeZone(timeZone);
  const includeArchived = params.show === "archived";
  const [loanData, ledger] = await Promise.all([loadLoans(supabase, userId, includeArchived), loadLedger(supabase, userId, { limit: 250 })]);
  const rows = loanProjections(loanData.loans, loanData.payments, loanData.accounts, today);
  const summary = loanSummary(rows, defaultCurrency);
  const defaultDigits = currencyMeta(loanData.currencies, defaultCurrency).decimal_digits;
  const selected = params.view ? rows.find((row) => row.id === params.view) ?? null : null;

  return (
    <div className="mx-auto max-w-[1500px] min-w-0 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
        <div className="min-w-0"><p className="text-sm font-semibold text-[var(--primary)]">Liabilities · Loan & Debt</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Khoản vay & dư nợ</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">Theo dõi gốc vay, lãi, lịch thanh toán, dư nợ thực tế và mô phỏng trả thêm để biết mình có thể hết nợ sớm hơn bao lâu.</p></div>
        <div className="flex flex-wrap gap-2"><Link href={includeArchived ? "/loans" : "/loans?show=archived"} className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-black">{includeArchived ? "Đang hoạt động" : "Đã lưu trữ"}</Link><InstantReveal label="Khoản vay mới"><LoanForm currencies={loanData.currencies} accounts={loanData.accounts} today={today} /></InstantReveal></div>
      </div>

      <AuthMessage error={params.error} message={params.message} />

      <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent><CreditCard className="size-5 text-[var(--primary)]" /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Tổng dư nợ · {defaultCurrency}</p><p className="mt-1 break-words text-2xl font-black">{formatMinorMoney(summary.remaining, defaultCurrency, defaultDigits)}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">{summary.count} khoản vay đang theo dõi</p></CardContent></Card>
        <Card><CardContent><TrendingDown className="size-5 text-emerald-600" /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Đã trả gốc</p><p className="mt-1 break-words text-2xl font-black">{formatMinorMoney(summary.paidPrincipal, defaultCurrency, defaultDigits)}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">Gốc ban đầu {formatMinorMoney(summary.original, defaultCurrency, defaultDigits)}</p></CardContent></Card>
        <Card><CardContent><ReceiptText className="size-5 text-violet-600" /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Lãi đã trả</p><p className="mt-1 break-words text-2xl font-black">{formatMinorMoney(summary.paidInterest, defaultCurrency, defaultDigits)}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">Theo lịch sử thanh toán thực tế</p></CardContent></Card>
        <Card><CardContent><AlertTriangle className={`size-5 ${summary.dueSoon > 0 ? "text-amber-600" : "text-emerald-600"}`} /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Sắp/đã đến hạn</p><p className="mt-1 text-2xl font-black">{summary.dueSoon}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">{summary.next?.next_due_date ? `Gần nhất ${viDate(summary.next.next_due_date)}` : "Không có kỳ cần chú ý"}</p></CardContent></Card>
      </div>

      {rows.length === 0 ? <Card className="mt-5"><CardContent className="py-14 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--sidebar-accent)] text-[var(--primary)]"><CreditCard className="size-6" /></div><h2 className="mt-4 text-lg font-black">Chưa có khoản vay</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted-foreground)]">Thêm khoản vay đầu tiên để theo dõi dư nợ và lịch thanh toán.</p><div className="mt-5 flex justify-center"><InstantReveal label="Tạo khoản vay đầu tiên"><LoanForm currencies={loanData.currencies} accounts={loanData.accounts} today={today} /></InstantReveal></div></CardContent></Card> : <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-2">{rows.map((loan) => { const digits = currencyMeta(loanData.currencies, loan.currency_code).decimal_digits; const status = statusMeta(loan); const StatusIcon = status.Icon; return <Card key={loan.id} className={loan.status === "overdue" ? "border-rose-500/25" : loan.status === "due_soon" ? "border-amber-500/25" : undefined}><CardContent className="p-5 sm:p-6"><div className="flex min-w-0 items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--muted)]" style={{ color: iconColorValue(loan.icon_color) }}><CategoryIcon name={loan.icon_name} className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h2 className="truncate text-lg font-black">{loan.name}</h2><p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{loan.lender_name || METHOD_LABELS[loan.interest_method]}</p></div><span className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide ${status.className}`}><StatusIcon className="size-3" /> {status.label}</span></div><div className="mt-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold text-[var(--muted-foreground)]">Dư nợ</p><p className="mt-1 break-words text-2xl font-black">{formatMinorMoney(loan.remaining_principal_minor, loan.currency_code, digits)}</p></div><div className="text-right"><p className="text-xs font-bold text-[var(--muted-foreground)]">Gốc ban đầu</p><p className="mt-1 text-sm font-black">{formatMinorMoney(loan.original_principal_minor, loan.currency_code, digits)}</p></div></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${Math.max(0, Math.min(100, loan.payoff_percent))}%` }} /></div><div className="mt-2 flex justify-between gap-3 text-[11px] font-bold"><span>Đã trả {loan.payoff_percent}% gốc</span><span className="text-[var(--muted-foreground)]">{Number(loan.annual_rate_percent)}%/năm · {loan.term_months} tháng · {FREQUENCY_LABELS[loan.payment_frequency]}</span></div></div></div><div className="mt-5 grid min-w-0 gap-2 sm:grid-cols-3"><div className="rounded-xl bg-[var(--muted)] p-3"><div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--muted-foreground)]"><CalendarDays className="size-3.5" /> Kỳ tiếp theo</div><p className="mt-1.5 text-xs font-black">{viDate(loan.next_due_date)}</p></div><div className="rounded-xl bg-[var(--muted)] p-3"><div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--muted-foreground)]"><WalletCards className="size-3.5" /> Số tiền</div><p className="mt-1.5 break-words text-xs font-black">{loan.next_due_date ? formatMinorMoney(loan.next_scheduled_payment_minor, loan.currency_code, digits) : "—"}</p></div><div className="rounded-xl bg-[var(--muted)] p-3"><div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--muted-foreground)]"><Landmark className="size-3.5" /> Tổng lãi dự kiến</div><p className="mt-1.5 break-words text-xs font-black">{formatMinorMoney(loan.projected_total_interest_minor, loan.currency_code, digits)}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><Link href={`/loans?view=${loan.id}${includeArchived ? "&show=archived" : ""}`} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--foreground)] px-3.5 text-xs font-black text-[var(--background)]">Chi tiết <ChevronRight className="size-3.5" /></Link>{!loan.is_archived && <InstantReveal label="Sửa" icon={false}><LoanForm currencies={loanData.currencies} accounts={loanData.accounts} today={today} editing={loan} /></InstantReveal>}<form action={setLoanArchivedAction}><input type="hidden" name="loan_id" value={loan.id} /><input type="hidden" name="archived" value={loan.is_archived ? "false" : "true"} /><PendingSubmitButton idleLabel={loan.is_archived ? "Khôi phục" : "Lưu trữ"} pendingLabel="Đang lưu..." className="h-10 rounded-xl border border-[var(--border)] px-3.5 text-xs font-black" /></form></div></CardContent></Card>; })}</div>}

      {selected && <LoanDetail loan={selected} digits={currencyMeta(loanData.currencies, selected.currency_code).decimal_digits} today={today} transactions={ledger.transactions} />}
    </div>
  );
}
