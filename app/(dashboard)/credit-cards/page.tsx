import Link from "next/link";
import { AlertTriangle, CheckCircle2, CreditCard as CreditCardIcon, ReceiptText, WalletCards, X } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { CategoryIconPicker } from "@/components/category-icon-picker";
import { InstantReveal } from "@/components/instant-reveal";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { DecimalInput } from "@/components/decimal-input";
import { MoneyCalculatorInput } from "@/components/money-calculator-input";
import { Card, CardContent } from "@/components/ui/card";
import { minorToMajorInput } from "@/features/accounts/money";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import {
  addCreditCardPaymentAction,
  createCreditCardAction,
  createCreditCardStatementAction,
  deleteCreditCardPaymentAction,
  setCreditCardArchivedAction,
  updateCreditCardAction
} from "@/features/credit-cards/actions";
import { creditCardSummary, loadCreditCards, projectCreditCards, type CreditCard, type CreditCardCurrency, type CreditCardProjection } from "@/features/credit-cards/data";
import { todayInTimeZone } from "@/features/recurring/data";
import { loadLedger } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thẻ tín dụng" };

type SearchParams = Promise<{ show?: string; error?: string; message?: string }>;

function currencyMeta(currencies: CreditCardCurrency[], code: string) {
  return currencies.find((currency) => currency.code === code) ?? { code, name: code, symbol: code, decimal_digits: 0 };
}
function viDate(value: string | null) { return value ? value.split("-").reverse().join("/") : "—"; }

function CardForm({ currencies, accounts, editing }: { currencies: CreditCardCurrency[]; accounts: Array<{ id: string; name: string; currency_code: string; is_archived: boolean }>; editing?: CreditCard }) {
  const action = editing ? updateCreditCardAction : createCreditCardAction;
  const code = editing?.currency_code ?? "VND";
  const digits = currencyMeta(currencies, code).decimal_digits;
  const eligibleAccounts = accounts.filter((account) => !account.is_archived && (!editing || account.currency_code === editing.currency_code));
  return (
    <Card className="border-emerald-500/25 shadow-xl shadow-black/5">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">Credit Card</p><h2 className="mt-1 text-lg font-black">{editing ? "Cập nhật thẻ tín dụng" : "Thêm thẻ tín dụng"}</h2><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Theo dõi hạn mức, utilization, sao kê và khoản phải thanh toán. Không lưu số thẻ đầy đủ.</p></div>
          <button type="button" data-instant-close aria-label="Đóng" className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></button>
        </div>
        <form action={action} className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
          {editing && <input type="hidden" name="card_id" value={editing.id} />}
          <label className="min-w-0 md:col-span-2"><span className="field-label">Tên thẻ</span><input name="name" required maxLength={120} defaultValue={editing?.name ?? ""} placeholder="VD: Visa Cashback" className="fin-input" /></label>
          <label className="min-w-0"><span className="field-label">Ngân hàng</span><input name="bank_name" maxLength={120} defaultValue={editing?.bank_name ?? ""} placeholder="VD: Techcombank" className="fin-input" /></label>
          <label className="min-w-0"><span className="field-label">4 số cuối</span><input name="last4" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} defaultValue={editing?.last4 ?? ""} placeholder="8821" className="fin-input" /></label>
          <label className="min-w-0"><span className="field-label">Tiền tệ</span>{editing ? <div className="fin-input flex items-center font-bold">{editing.currency_code}<span className="ml-2 text-[11px] font-normal text-[var(--muted-foreground)]">· khóa sau khi tạo</span></div> : <select name="currency_code" defaultValue="VND" className="fin-input">{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} · {currency.name}</option>)}</select>}</label>
          <label className="min-w-0"><span className="field-label">Hạn mức tín dụng</span><MoneyCalculatorInput name="credit_limit" required defaultValue={editing ? minorToMajorInput(editing.credit_limit_minor, digits) : ""} decimalDigits={digits} currencyCode={code} placeholder="50000000" /></label>
          <label className="min-w-0"><span className="field-label">Dư nợ hiện tại</span><MoneyCalculatorInput name="current_balance" required defaultValue={editing ? minorToMajorInput(editing.current_balance_minor, digits) : "0"} decimalDigits={digits} currencyCode={code} /></label>
          <label className="min-w-0"><span className="field-label">Lãi suất năm (%)</span><DecimalInput name="annual_rate_percent" defaultValue={editing?.annual_rate_percent ?? 30} min={0} max={100} maxDecimals={4} /></label>
          <label className="min-w-0"><span className="field-label">Ngày chốt sao kê</span><input name="statement_day" type="number" min={1} max={28} defaultValue={editing?.statement_day ?? 20} className="fin-input" /></label>
          <label className="min-w-0"><span className="field-label">Số ngày tới hạn</span><input name="due_days_after_statement" type="number" min={1} max={60} defaultValue={editing?.due_days_after_statement ?? 15} className="fin-input" /></label>
          <label className="min-w-0"><span className="field-label">Thanh toán tối thiểu (%)</span><DecimalInput name="minimum_payment_percent" defaultValue={editing?.minimum_payment_percent ?? 5} min={0} max={100} maxDecimals={4} /></label>
          <label className="min-w-0"><span className="field-label">Mức tối thiểu cố định</span><MoneyCalculatorInput name="minimum_payment_floor" defaultValue={editing ? minorToMajorInput(editing.minimum_payment_floor_minor, digits) : "0"} decimalDigits={digits} currencyCode={code} /></label>
          <label className="min-w-0"><span className="field-label">Tài khoản thanh toán</span><select name="linked_payment_account_id" defaultValue={editing?.linked_payment_account_id ?? ""} className="fin-input"><option value="">Không liên kết</option>{eligibleAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select></label>
          <label className="min-w-0 md:col-span-2"><span className="field-label">Ghi chú</span><textarea name="notes" maxLength={1000} rows={3} defaultValue={editing?.notes ?? ""} className="fin-textarea" placeholder="Ưu đãi, phí thường niên, ghi chú cá nhân..." /></label>
          <div className="md:col-span-2"><span className="field-label">Icon & màu</span><CategoryIconPicker defaultValue={editing?.icon_name ?? "CreditCard"} defaultColor={editing?.icon_color ?? "#2563eb"} /></div>
          <div className="flex flex-wrap gap-2 md:col-span-2"><PendingSubmitButton idleLabel={editing ? "Lưu thẻ" : "Tạo thẻ"} pendingLabel="Đang lưu..." className="fin-primary-btn" /><button type="button" data-instant-close className="fin-secondary-btn">Hủy</button></div>
        </form>
      </CardContent>
    </Card>
  );
}

function StatementForm({ card, digits, today }: { card: CreditCardProjection; digits: number; today: string }) {
  return <Card className="border-sky-500/25"><CardContent className="p-5"><h3 className="font-black">Tạo sao kê · {card.name}</h3><form action={createCreditCardStatementAction} className="mt-4 grid gap-3 sm:grid-cols-2"><input type="hidden" name="card_id" value={card.id} /><label><span className="field-label">Ngày sao kê</span><input type="date" name="statement_date" required defaultValue={today} className="fin-input" /></label><label><span className="field-label">Số dư sao kê</span><MoneyCalculatorInput name="statement_balance" required defaultValue={minorToMajorInput(card.current_balance_minor, digits)} decimalDigits={digits} currencyCode={card.currency_code} /></label><label className="sm:col-span-2"><span className="field-label">Ghi chú</span><input name="notes" maxLength={500} className="fin-input" /></label><div className="sm:col-span-2 flex gap-2"><PendingSubmitButton idleLabel="Tạo sao kê" pendingLabel="Đang tạo sao kê..." className="fin-primary-btn" /><button type="button" data-instant-close className="fin-secondary-btn">Hủy</button></div></form></CardContent></Card>;
}

function PaymentForm({ card, digits, today, transactions }: { card: CreditCardProjection; digits: number; today: string; transactions: Array<{ id: string; title: string; transaction_date: string; transaction_type: string; entries: Array<{ amount_minor: number; currency_code: string; account_id: string }> }> }) {
  const eligible = transactions.filter((tx) => tx.transaction_type === "expense" && tx.entries.some((entry) => entry.amount_minor < 0 && entry.currency_code === card.currency_code && (!card.linked_payment_account_id || entry.account_id === card.linked_payment_account_id))).slice(0, 100);
  return <Card className="border-emerald-500/25"><CardContent className="p-5"><h3 className="font-black">Ghi nhận thanh toán · {card.name}</h3><form action={addCreditCardPaymentAction} className="mt-4 grid gap-3 sm:grid-cols-2"><input type="hidden" name="card_id" value={card.id} /><label><span className="field-label">Ngày thanh toán</span><input type="date" name="payment_date" required defaultValue={today} className="fin-input" /></label><label><span className="field-label">Số tiền</span><MoneyCalculatorInput name="amount" required decimalDigits={digits} currencyCode={card.currency_code} placeholder={minorToMajorInput(card.latest_statement?.remaining_minor ?? card.current_balance_minor, digits)} /></label><label><span className="field-label">Sao kê liên quan</span><select name="statement_id" className="fin-input"><option value="">Không gắn sao kê</option>{card.statements.filter((statement) => statement.remaining_minor > 0).map((statement) => <option key={statement.id} value={statement.id}>{viDate(statement.statement_date)} · còn {formatMinorMoney(statement.remaining_minor, card.currency_code, digits)}</option>)}</select></label><label><span className="field-label">Transaction Ledger</span><select name="transaction_id" className="fin-input"><option value="">Không liên kết</option>{eligible.map((tx) => <option key={tx.id} value={tx.id}>{viDate(tx.transaction_date)} · {tx.title}</option>)}</select></label><label className="sm:col-span-2"><span className="field-label">Ghi chú</span><input name="notes" maxLength={500} className="fin-input" /></label><div className="sm:col-span-2 flex gap-2"><PendingSubmitButton idleLabel="Ghi nhận thanh toán" pendingLabel="Đang ghi nhận..." className="fin-primary-btn" /><button type="button" data-instant-close className="fin-secondary-btn">Hủy</button></div></form></CardContent></Card>;
}

export default async function CreditCardsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const defaultCurrency = preferences?.currency_code ?? "VND";
  const today = todayInTimeZone(preferences?.timezone ?? "Asia/Ho_Chi_Minh");
  const includeArchived = params.show === "archived";
  const [data, ledger] = await Promise.all([loadCreditCards(supabase, userId, includeArchived), loadLedger(supabase, userId, { limit: 300 })]);
  const cards = projectCreditCards(data.cards, data.statements, data.payments, data.accounts, today);
  const summary = creditCardSummary(cards, defaultCurrency);
  const defaultDigits = currencyMeta(data.currencies, defaultCurrency).decimal_digits;
  const utilization = summary.totalLimit > 0 ? Math.round(summary.totalBalance / summary.totalLimit * 1000) / 10 : 0;

  return <div className="mx-auto max-w-[1500px] min-w-0 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div className="min-w-0"><p className="text-sm font-semibold text-[var(--primary)]">Credit · Revolving</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Thẻ tín dụng</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">Theo dõi hạn mức, dư nợ, utilization, sao kê, minimum payment và lịch thanh toán mà không lưu thông tin thẻ nhạy cảm.</p></div><div className="flex flex-wrap gap-2"><Link href={includeArchived ? "/credit-cards" : "/credit-cards?show=archived"} className="fin-secondary-btn">{includeArchived ? "Đang hoạt động" : "Đã lưu trữ"}</Link><InstantReveal label="Thẻ mới"><CardForm currencies={data.currencies} accounts={data.accounts} /></InstantReveal></div></div>
    <AuthMessage error={params.error} message={params.message} />

    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="fin-card"><CardContent><CreditCardIcon className="size-5 text-[var(--primary)]" /><p className="fin-stat-label">Tổng hạn mức · {defaultCurrency}</p><p className="fin-stat-value">{formatMinorMoney(summary.totalLimit, defaultCurrency, defaultDigits)}</p><p className="fin-stat-help">{summary.count} thẻ đang hoạt động</p></CardContent></Card>
      <Card className="fin-card"><CardContent><ReceiptText className="size-5 text-rose-500" /><p className="fin-stat-label">Dư nợ hiện tại</p><p className="fin-stat-value">{formatMinorMoney(summary.totalBalance, defaultCurrency, defaultDigits)}</p><p className="fin-stat-help">Utilization tổng {utilization}%</p></CardContent></Card>
      <Card className="fin-card"><CardContent><WalletCards className="size-5 text-sky-600" /><p className="fin-stat-label">Hạn mức còn lại</p><p className="fin-stat-value">{formatMinorMoney(summary.available, defaultCurrency, defaultDigits)}</p><p className="fin-stat-help">Khả dụng trên các thẻ</p></CardContent></Card>
      <Card className="fin-card"><CardContent><AlertTriangle className={`size-5 ${summary.dueAttention || summary.highUtilization ? "text-amber-500" : "text-emerald-600"}`} /><p className="fin-stat-label">Cần chú ý</p><p className="fin-stat-value">{summary.dueAttention + summary.highUtilization}</p><p className="fin-stat-help">Sắp/quá hạn hoặc utilization ≥ 80%</p></CardContent></Card>
    </div>

    {cards.length === 0 ? <Card className="mt-5"><CardContent className="py-14 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--sidebar-accent)] text-[var(--primary)]"><CreditCardIcon className="size-6" /></div><h2 className="mt-4 text-lg font-black">Chưa có thẻ tín dụng</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted-foreground)]">Thêm thẻ đầu tiên để theo dõi utilization và kỳ sao kê.</p><div className="mt-5 flex justify-center"><InstantReveal label="Tạo thẻ đầu tiên"><CardForm currencies={data.currencies} accounts={data.accounts} /></InstantReveal></div></CardContent></Card> : <div className="mt-5 grid gap-4 xl:grid-cols-2">{cards.map((card) => { const digits = currencyMeta(data.currencies, card.currency_code).decimal_digits; const alert = card.alert_level === "high" ? "text-rose-600" : card.alert_level === "attention" ? "text-amber-600" : "text-emerald-600"; const latest = card.latest_statement; return <Card key={card.id} className="fin-card overflow-hidden"><CardContent className="p-5 sm:p-6"><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--muted)]" style={{ color: iconColorValue(card.icon_color) }}><CategoryIcon name={card.icon_name} className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h2 className="truncate text-lg font-black">{card.name}</h2><p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{card.bank_name || "Credit card"}{card.last4 ? ` · •••• ${card.last4}` : ""}</p></div>{card.is_archived ? <span className="fin-badge">Đã lưu trữ</span> : <span className={`text-xs font-black ${alert}`}>{card.utilization_percent}% utilization</span>}</div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div><p className="fin-stat-label mt-0">Dư nợ</p><p className="text-xl font-black">{formatMinorMoney(card.current_balance_minor, card.currency_code, digits)}</p></div><div><p className="fin-stat-label mt-0">Hạn mức</p><p className="text-sm font-black">{formatMinorMoney(card.credit_limit_minor, card.currency_code, digits)}</p></div><div><p className="fin-stat-label mt-0">Khả dụng</p><p className="text-sm font-black">{formatMinorMoney(card.available_credit_minor, card.currency_code, digits)}</p></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--muted)]"><div className={card.alert_level === "high" ? "h-full rounded-full bg-rose-500" : card.alert_level === "attention" ? "h-full rounded-full bg-amber-500" : "h-full rounded-full bg-[var(--primary)]"} style={{ width: `${Math.min(100, card.utilization_percent)}%` }} /></div></div></div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3"><div className="fin-mini-card"><p className="fin-mini-label">Sao kê gần nhất</p><p className="fin-mini-value">{latest ? viDate(latest.statement_date) : "—"}</p></div><div className="fin-mini-card"><p className="fin-mini-label">Đến hạn</p><p className="fin-mini-value">{latest ? viDate(latest.due_date) : "—"}</p></div><div className="fin-mini-card"><p className="fin-mini-label">Minimum due</p><p className="fin-mini-value">{latest ? formatMinorMoney(latest.minimum_payment_minor, card.currency_code, digits) : "—"}</p></div></div>
        {latest && <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black">Sao kê {viDate(latest.statement_date)}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Đã trả {formatMinorMoney(latest.paid_minor, card.currency_code, digits)} · Còn {formatMinorMoney(latest.remaining_minor, card.currency_code, digits)}</p></div><span className={`fin-badge ${latest.status === "paid" ? "text-emerald-600" : latest.status === "overdue" ? "text-rose-600" : latest.status === "due_soon" ? "text-amber-600" : ""}`}>{latest.status === "paid" ? "Đã thanh toán" : latest.status === "overdue" ? "Quá hạn" : latest.status === "due_soon" ? "Sắp đến hạn" : "Đang mở"}</span></div></div>}
        <div className="mt-5 flex flex-wrap gap-2">{!card.is_archived && <><InstantReveal label="Thanh toán" icon={false}><PaymentForm card={card} digits={digits} today={today} transactions={ledger.transactions} /></InstantReveal><InstantReveal label="Sao kê" icon={false}><StatementForm card={card} digits={digits} today={today} /></InstantReveal><InstantReveal label="Sửa" icon={false}><CardForm currencies={data.currencies} accounts={data.accounts} editing={card} /></InstantReveal></>}<form action={setCreditCardArchivedAction}><input type="hidden" name="card_id" value={card.id} /><input type="hidden" name="archived" value={card.is_archived ? "false" : "true"} /><PendingSubmitButton idleLabel={card.is_archived ? "Khôi phục" : "Lưu trữ"} pendingLabel="Đang lưu..." className="fin-secondary-btn" /></form></div>
        {card.payments.length > 0 && <div className="mt-5 border-t border-[var(--border)] pt-4"><h3 className="text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Thanh toán gần đây</h3><div className="mt-2 space-y-2">{card.payments.slice(0, 4).map((payment) => <div key={payment.id} className="flex items-center gap-3 rounded-xl bg-[var(--muted)] p-3"><CheckCircle2 className="size-4 text-emerald-600" /><div className="min-w-0 flex-1"><p className="text-xs font-black">{viDate(payment.payment_date)} · {formatMinorMoney(payment.amount_minor, card.currency_code, digits)}</p><p className="mt-0.5 truncate text-[10px] text-[var(--muted-foreground)]">{payment.notes || "Thanh toán thẻ"}</p></div><form action={deleteCreditCardPaymentAction}><input type="hidden" name="payment_id" value={payment.id} /><button type="submit" className="grid size-8 place-items-center rounded-lg border border-[var(--border)]"><X className="size-3.5" /></button></form></div>)}</div></div>}
      </CardContent></Card>; })}</div>}
  </div>;
}
