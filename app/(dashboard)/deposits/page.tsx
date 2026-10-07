import Link from "next/link";
import { AlertTriangle, Archive, CalendarDays, Clock3, Landmark, Pencil, Percent, ReceiptText, RotateCcw, ShieldCheck, TrendingUp, X } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { CategoryIconPicker } from "@/components/category-icon-picker";
import { DepositTermComparison } from "@/components/deposit-term-comparison";
import { InstantReveal } from "@/components/instant-reveal";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { minorToMajorInput } from "@/features/accounts/money";
import { CategoryIcon } from "@/features/categories/icons";
import { addDepositInterestEntryAction, createDepositAction, deleteDepositInterestEntryAction, setDepositArchivedAction, updateDepositAction } from "@/features/deposits/actions";
import { depositProjections, depositSummary, loadDeposits, type Deposit, type DepositAccount, type DepositCurrency, type DepositProjection } from "@/features/deposits/data";
import { todayInTimeZone } from "@/features/recurring/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ new?: string; edit?: string; show?: string; error?: string; message?: string }>;

const METHOD_LABELS = {
  simple_maturity: "Lãi đơn · nhận khi đáo hạn",
  compound_monthly: "Lãi kép · nhập gốc hàng tháng",
  monthly_payout: "Trả lãi hàng tháng"
} as const;

function currencyMeta(currencies: DepositCurrency[], code: string) {
  return currencies.find((currency) => currency.code === code) ?? { code, name: code, symbol: code, decimal_digits: 0 };
}
function viDate(value: string | null) { return value ? value.split("-").reverse().join("/") : "—"; }
function statusMeta(row: DepositProjection) {
  if (row.status === "archived") return { label: "Đã lưu trữ", className: "bg-[var(--muted)] text-[var(--muted-foreground)]", Icon: Archive };
  if (row.status === "matured") return { label: "Đã đến hạn", className: "bg-rose-500/10 text-rose-500", Icon: AlertTriangle };
  if (row.status === "due_soon") return { label: "Sắp đáo hạn", className: "bg-amber-500/10 text-amber-500", Icon: Clock3 };
  return { label: "Đang hoạt động", className: "bg-emerald-500/10 text-emerald-500", Icon: ShieldCheck };
}

function DepositForm({ currencies, accounts, today, editing }: { currencies: DepositCurrency[]; accounts: DepositAccount[]; today: string; editing?: Deposit }) {
  const isEditing = Boolean(editing);
  const action = isEditing ? updateDepositAction : createDepositAction;
  const selectedCurrency = editing?.currency_code ?? "VND";
  const digits = currencyMeta(currencies, selectedCurrency).decimal_digits;
  const eligibleAccounts = accounts.filter((account) => !account.is_archived && (!editing || account.currency_code === editing.currency_code));

  return (
    <Card className="border-emerald-500/25">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">{isEditing ? "Edit deposit" : "New deposit"}</p><h2 className="mt-1 text-lg font-black">{isEditing ? "Cập nhật tiền gửi" : "Thêm khoản tiền gửi"}</h2><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Maturity date được tính từ ngày gửi + kỳ hạn. Số dư Account chỉ thay đổi qua Transaction Core.</p></div>
          <Link href="/deposits" data-instant-close aria-label="Đóng" className="grid size-9 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)]"><X className="size-4" /></Link>
        </div>
        <form action={action} className="mt-5 grid gap-4 md:grid-cols-2">
          {editing && <input type="hidden" name="deposit_id" value={editing.id} />}
          <label className="md:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tên khoản tiền gửi</span><input name="name" defaultValue={editing?.name ?? ""} required maxLength={120} placeholder="VD: VCB 12 tháng" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)]" /></label>
          <label><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Ngân hàng / tổ chức</span><input name="institution_name" defaultValue={editing?.institution_name ?? ""} maxLength={120} placeholder="VD: Vietcombank" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)]" /></label>
          <label><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tiền tệ</span>{editing ? <div className="flex h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 text-sm font-bold">{editing.currency_code}<span className="ml-2 text-[11px] font-normal text-[var(--muted-foreground)]">· khóa sau khi tạo</span></div> : <select name="currency_code" defaultValue="VND" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm">{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} · {currency.name}</option>)}</select>}</label>
          <label><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tiền gốc</span><input name="principal" inputMode="decimal" required defaultValue={editing ? minorToMajorInput(editing.principal_minor, digits) : ""} placeholder="100000000" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)]" /></label>
          <label><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Lãi suất năm (%)</span><input name="annual_rate_percent" inputMode="decimal" required defaultValue={editing?.annual_rate_percent ?? "5.8"} placeholder="5.8" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)]" /></label>
          <label><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Kỳ hạn (tháng)</span><input name="term_months" inputMode="numeric" type="number" min={1} max={600} required defaultValue={editing?.term_months ?? 12} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)]" /><span className="mt-1 block text-[10px] text-[var(--muted-foreground)]">Gợi ý: 1, 3, 6, 12, 18, 24 tháng.</span></label>
          <label><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Ngày gửi</span><input name="start_date" type="date" required defaultValue={editing?.start_date ?? today} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" /></label>
          <label><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Cách tính / trả lãi</span><select name="interest_method" defaultValue={editing?.interest_method ?? "simple_maturity"} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="simple_maturity">Lãi đơn · nhận khi đáo hạn</option><option value="compound_monthly">Lãi kép · nhập gốc hàng tháng</option><option value="monthly_payout">Trả lãi hàng tháng</option></select></label>
          <label><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tài khoản liên kết</span><select name="linked_account_id" defaultValue={editing?.linked_account_id ?? ""} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="">Không liên kết</option>{eligibleAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select></label>
          <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3.5"><input name="auto_renew" type="checkbox" defaultChecked={editing?.auto_renew ?? false} className="size-4 accent-emerald-500" /><span><span className="block text-sm font-bold">Tự động tái tục</span><span className="text-[11px] text-[var(--muted-foreground)]">Theo dõi để quyết định khi đến hạn.</span></span></label>
          <label className="md:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Ghi chú</span><textarea name="notes" defaultValue={editing?.notes ?? ""} maxLength={1000} rows={3} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--primary)]" placeholder="Điều kiện rút trước hạn, ghi chú cá nhân..." /></label>
          <div className="md:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Icon</span><CategoryIconPicker defaultValue={editing?.icon_name ?? "Landmark"} /></div>
          <div className="flex flex-wrap gap-2 md:col-span-2"><PendingSubmitButton idleLabel={editing ? "Lưu tiền gửi" : "Tạo tiền gửi"} pendingLabel={editing ? "Đang lưu..." : "Đang tạo tiền gửi..."} className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-black text-white" /><Link href="/deposits" data-instant-close className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] px-4 text-sm font-bold">Hủy</Link></div>
        </form>
      </CardContent>
    </Card>
  );
}

function InterestEntryForm({ row, today, digits }: { row: DepositProjection; today: string; digits: number }) {
  return <Card className="border-sky-500/20"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-sky-500">Realized interest</p><h3 className="mt-1 font-black">Ghi nhận lãi / thuế / phí</h3><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Theo dõi khoản thực tế; không tự thay đổi Account Ledger.</p></div><button type="button" data-instant-close className="grid size-9 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></button></div><form action={addDepositInterestEntryAction} className="mt-4 grid gap-3 sm:grid-cols-2"><input type="hidden" name="deposit_id" value={row.id} /><label><span className="mb-1.5 block text-xs font-bold text-[var(--muted-foreground)]">Loại</span><select name="entry_type" defaultValue="interest" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="interest">Lãi nhận được (+)</option><option value="tax">Thuế (-)</option><option value="fee">Phí (-)</option><option value="adjustment">Điều chỉnh (+/-)</option></select></label><label><span className="mb-1.5 block text-xs font-bold text-[var(--muted-foreground)]">Số tiền · {row.currency_code}</span><input name="amount" inputMode="decimal" required placeholder={digits === 0 ? "1000000" : "100.00"} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" /></label><label><span className="mb-1.5 block text-xs font-bold text-[var(--muted-foreground)]">Ngày</span><input name="entry_date" type="date" required defaultValue={today} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" /></label><label><span className="mb-1.5 block text-xs font-bold text-[var(--muted-foreground)]">Ghi chú</span><input name="notes" maxLength={500} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" /></label><div className="sm:col-span-2"><PendingSubmitButton idleLabel="Ghi nhận" pendingLabel="Đang ghi nhận..." className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-black text-white" /></div></form></CardContent></Card>;
}

export default async function DepositsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const defaultCurrency = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const today = todayInTimeZone(timeZone);
  const data = await loadDeposits(supabase, userId, true);
  const rows = depositProjections(data.deposits, data.entries, data.accounts, today);
  const showArchived = params.show === "archived";
  const visible = rows.filter((row) => row.is_archived === showArchived);
  const editing = params.edit ? data.deposits.find((row) => row.id === params.edit && !row.is_archived) : undefined;
  const summary = depositSummary(rows, defaultCurrency);
  const defaultDigits = currencyMeta(data.currencies, defaultCurrency).decimal_digits;

  return (
    <div className="mx-auto max-w-[1450px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--primary)]">Interest · Deposit Manager</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Tiền gửi & lãi suất</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">Theo dõi gốc, lãi suất, kỳ hạn, đáo hạn, auto-renew và lãi thực nhận. Planning/monitoring được tách khỏi Transaction Ledger.</p></div><InstantReveal label="Thêm tiền gửi" initialOpen={params.new === "1"}><DepositForm currencies={data.currencies} accounts={data.accounts} today={today} /></InstantReveal></div>
      <AuthMessage error={params.error} message={params.message} />
      {editing && <div className="mt-5"><DepositForm currencies={data.currencies} accounts={data.accounts} today={today} editing={editing} /></div>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent><Landmark className="size-5 text-[var(--primary)]" /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Tổng gốc · {defaultCurrency}</p><p className="mt-1 text-2xl font-black">{formatMinorMoney(summary.principal, defaultCurrency, defaultDigits)}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">{summary.count} khoản đang theo dõi</p></CardContent></Card>
        <Card><CardContent><TrendingUp className="size-5 text-emerald-500" /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Lãi dự kiến</p><p className="mt-1 text-2xl font-black text-emerald-500">+{formatMinorMoney(summary.projectedInterest, defaultCurrency, defaultDigits)}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">Theo cấu hình kỳ hạn hiện tại</p></CardContent></Card>
        <Card><CardContent><ReceiptText className="size-5 text-sky-500" /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Lãi thực nhận ròng</p><p className="mt-1 text-2xl font-black">{formatMinorMoney(summary.realizedInterest, defaultCurrency, defaultDigits)}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">Lãi - thuế - phí + điều chỉnh</p></CardContent></Card>
        <Card><CardContent><CalendarDays className={`size-5 ${summary.dueSoon > 0 ? "text-amber-500" : "text-emerald-500"}`} /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Đáo hạn cần chú ý</p><p className="mt-1 text-2xl font-black">{summary.dueSoon}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">{summary.next ? `Gần nhất ${viDate(summary.next.maturity_date)}` : "Chưa có kỳ đáo hạn sắp tới"}</p></CardContent></Card>
      </div>

      <div className="mt-5"><DepositTermComparison currencyCode={defaultCurrency} decimalDigits={defaultDigits} /></div>
      <div className="mt-5 flex items-center gap-2"><Link href="/deposits" className={`rounded-xl px-3 py-2 text-xs font-black ${!showArchived ? "bg-[var(--primary)] text-white" : "border border-[var(--border)]"}`}>Đang theo dõi ({rows.filter((row) => !row.is_archived).length})</Link><Link href="/deposits?show=archived" className={`rounded-xl px-3 py-2 text-xs font-black ${showArchived ? "bg-[var(--primary)] text-white" : "border border-[var(--border)]"}`}>Đã lưu trữ ({rows.filter((row) => row.is_archived).length})</Link></div>

      {visible.length === 0 ? <Card className="mt-4"><CardContent className="py-14 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--sidebar-accent)] text-[var(--primary)]"><Landmark className="size-6" /></div><h2 className="mt-4 text-lg font-black">{showArchived ? "Chưa có tiền gửi lưu trữ" : "Chưa có khoản tiền gửi"}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted-foreground)]">Tạo khoản đầu tiên để theo dõi lãi suất, ngày đáo hạn và số tiền dự kiến nhận.</p>{!showArchived && <div className="mt-5 flex justify-center"><InstantReveal label="Tạo tiền gửi đầu tiên"><DepositForm currencies={data.currencies} accounts={data.accounts} today={today} /></InstantReveal></div>}</CardContent></Card> : <div className="mt-4 grid gap-4 xl:grid-cols-2">{visible.map((row) => {
        const digits = currencyMeta(data.currencies, row.currency_code).decimal_digits;
        const status = statusMeta(row); const StatusIcon = status.Icon;
        return <Card key={row.id} className={row.status === "matured" ? "border-rose-500/25" : row.status === "due_soon" ? "border-amber-500/25" : undefined}><CardContent className="p-5 sm:p-6"><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--sidebar-accent)] text-[var(--primary)]"><CategoryIcon name={row.icon_name} className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-lg font-black">{row.name}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{row.institution_name || "Không ghi tổ chức"} · {row.currency_code}</p></div><span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black uppercase ${status.className}`}><StatusIcon className="size-3" /> {status.label}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div><p className="text-[10px] font-black uppercase text-[var(--muted-foreground)]">Tiền gốc</p><p className="mt-1 text-base font-black">{formatMinorMoney(row.principal_minor, row.currency_code, digits)}</p></div><div><p className="text-[10px] font-black uppercase text-[var(--muted-foreground)]">Lãi suất</p><p className="mt-1 text-base font-black text-emerald-500">{Number(row.annual_rate_percent).toLocaleString("vi-VN", { maximumFractionDigits: 4 })}% / năm</p></div><div><p className="text-[10px] font-black uppercase text-[var(--muted-foreground)]">Kỳ hạn</p><p className="mt-1 text-base font-black">{row.term_months} tháng</p></div></div></div></div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-[var(--muted)] p-3"><p className="text-[10px] font-black uppercase text-[var(--muted-foreground)]">Lãi dự kiến</p><p className="mt-1 text-xs font-black text-emerald-500">+{formatMinorMoney(row.projected_interest_minor, row.currency_code, digits)}</p></div><div className="rounded-xl bg-[var(--muted)] p-3"><p className="text-[10px] font-black uppercase text-[var(--muted-foreground)]">Tổng thu cả kỳ</p><p className="mt-1 text-xs font-black">{formatMinorMoney(row.projected_total_return_minor, row.currency_code, digits)}</p></div><div className="rounded-xl bg-[var(--muted)] p-3"><p className="text-[10px] font-black uppercase text-[var(--muted-foreground)]">Ngày đáo hạn</p><p className="mt-1 text-xs font-black">{viDate(row.maturity_date)}</p></div><div className="rounded-xl bg-[var(--muted)] p-3"><p className="text-[10px] font-black uppercase text-[var(--muted-foreground)]">Còn lại</p><p className="mt-1 text-xs font-black">{row.days_to_maturity < 0 ? `Quá ${Math.abs(row.days_to_maturity)} ngày` : `${row.days_to_maturity} ngày`}</p></div></div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-1"><Percent className="size-3" /> {METHOD_LABELS[row.interest_method]}</span><span className="inline-flex items-center gap-1"><RotateCcw className="size-3" /> {row.auto_renew ? "Auto-renew bật" : "Không tự tái tục"}</span>{row.linked_account && <span className="inline-flex items-center gap-1"><Landmark className="size-3" /> {row.linked_account.name}</span>}</div>
        {!row.is_archived && <div className="mt-5 flex flex-wrap gap-2"><InstantReveal label="Ghi nhận lãi" icon={false}><InterestEntryForm row={row} today={today} digits={digits} /></InstantReveal><Link href={`/deposits?edit=${row.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3.5 text-xs font-black"><Pencil className="size-3.5" /> Sửa</Link><form action={setDepositArchivedAction}><input type="hidden" name="deposit_id" value={row.id} /><input type="hidden" name="archived" value="true" /><PendingSubmitButton idleLabel="Lưu trữ" pendingLabel="Đang lưu trữ..." className="h-10 rounded-xl border border-[var(--border)] px-3.5 text-xs font-black" /></form></div>}
        {row.is_archived && <form action={setDepositArchivedAction} className="mt-5"><input type="hidden" name="deposit_id" value={row.id} /><input type="hidden" name="archived" value="false" /><PendingSubmitButton idleLabel="Khôi phục" pendingLabel="Đang khôi phục..." className="h-10 rounded-xl bg-[var(--primary)] px-4 text-xs font-black text-white" /></form>}
        <div className="mt-5 border-t border-[var(--border)] pt-4"><div className="flex items-center justify-between"><h3 className="text-xs font-black uppercase text-[var(--muted-foreground)]">Lãi thực tế gần đây</h3><span className="text-[10px] text-[var(--muted-foreground)]">Ròng {formatMinorMoney(row.realized_net_interest_minor, row.currency_code, digits)}</span></div>{row.entries.length === 0 ? <p className="mt-3 text-xs text-[var(--muted-foreground)]">Chưa ghi nhận lãi/thuế/phí thực tế.</p> : <div className="mt-3 space-y-2">{row.entries.slice(0, 4).map((entry) => <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><div className={`grid size-8 shrink-0 place-items-center rounded-lg ${entry.amount_minor >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}><TrendingUp className="size-3.5" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{entry.entry_type === "interest" ? "Lãi thực nhận" : entry.entry_type === "tax" ? "Thuế" : entry.entry_type === "fee" ? "Phí" : "Điều chỉnh"}</p><p className="mt-0.5 truncate text-[10px] text-[var(--muted-foreground)]">{viDate(entry.entry_date)}{entry.notes ? ` · ${entry.notes}` : ""}</p></div><span className={`text-xs font-black ${entry.amount_minor >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{entry.amount_minor > 0 ? "+" : "−"}{formatMinorMoney(Math.abs(entry.amount_minor), row.currency_code, digits)}</span>{!row.is_archived && <form action={deleteDepositInterestEntryAction}><input type="hidden" name="entry_id" value={entry.id} /><PendingSubmitButton idleLabel="Xóa" pendingLabel="..." className="h-8 rounded-lg border border-[var(--border)] px-2 text-[10px] font-black" /></form>}</div>)}</div>}</div>
        {row.notes && <p className="mt-4 rounded-xl bg-[var(--muted)] p-3 text-xs leading-5 text-[var(--muted-foreground)]">{row.notes}</p>}
        </CardContent></Card>;
      })}</div>}

      <Card className="mt-5 border-amber-500/20"><CardContent className="p-5 text-xs leading-6 text-[var(--muted-foreground)]"><strong className="text-[var(--foreground)]">Lưu ý tính lãi:</strong> mô phỏng dùng lãi suất danh nghĩa năm và kỳ hạn theo tháng. Ngân hàng thực tế có thể áp dụng số ngày thực tế, lãi suất rút trước hạn, thuế/phí hoặc quy tắc làm tròn khác. Finzaro tách “lãi dự kiến” và “lãi thực nhận” để không trộn planning với ledger.</CardContent></Card>
    </div>
  );
}
