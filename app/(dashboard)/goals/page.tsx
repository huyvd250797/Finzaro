import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Link2,
  Pencil,
  PiggyBank,
  RotateCcw,
  Target,
  Trash2,
  TrendingUp,
  X
} from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { CategoryIconPicker } from "@/components/category-icon-picker";
import { InstantReveal } from "@/components/instant-reveal";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { minorToMajorInput } from "@/features/accounts/money";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import {
  addSavingsGoalEntryAction,
  createSavingsGoalAction,
  deleteSavingsGoalEntryAction,
  setSavingsGoalArchivedAction,
  updateSavingsGoalAction
} from "@/features/goals/actions";
import {
  loadSavingsGoals,
  savingsGoalProgress,
  savingsGoalSummary,
  type SavingsGoalProgress
} from "@/features/goals/data";
import { todayInTimeZone } from "@/features/recurring/data";
import { currencyDigits, loadLedger, type TransactionView } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const metadata = { title: "Mục tiêu tiết kiệm" };

type SearchParams = Promise<{ show?: string; message?: string; error?: string }>;

type Currency = { code: string; decimal_digits: number; symbol: string };

function viDate(value: string | null) {
  if (!value) return "Không giới hạn";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function statusMeta(goal: SavingsGoalProgress) {
  if (goal.status === "completed") return { label: "Đã hoàn thành", className: "bg-emerald-500/10 text-emerald-500", Icon: CheckCircle2 };
  if (goal.status === "overdue") return { label: "Quá hạn", className: "bg-rose-500/10 text-rose-500", Icon: AlertTriangle };
  if (goal.status === "behind") return { label: "Chậm tiến độ", className: "bg-amber-500/10 text-amber-500", Icon: Clock3 };
  if (goal.status === "on_track") return { label: "Đúng tiến độ", className: "bg-sky-500/10 text-sky-500", Icon: TrendingUp };
  if (goal.status === "archived") return { label: "Đã lưu trữ", className: "bg-[var(--muted)] text-[var(--muted-foreground)]", Icon: Archive };
  return { label: "Đang thực hiện", className: "bg-violet-500/10 text-violet-500", Icon: Target };
}

function GoalForm({
  currencies,
  accounts,
  editing
}: {
  currencies: Currency[];
  accounts: Array<{ id: string; name: string; currency_code: string; is_archived: boolean }>;
  editing?: SavingsGoalProgress | null;
}) {
  const currency = editing?.currency_code ?? "VND";
  const digits = currencies.find((item) => item.code === currency)?.decimal_digits ?? 0;
  const compatibleAccounts = editing ? accounts.filter((account) => account.currency_code === editing.currency_code && !account.is_archived) : accounts.filter((account) => !account.is_archived);

  return (
    <Card className="border-emerald-500/25 shadow-2xl">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">Savings Goals</p>
            <h2 className="mt-1 text-xl font-black">{editing ? `Sửa ${editing.name}` : "Mục tiêu tiết kiệm mới"}</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Theo dõi tiến độ mà không làm thay đổi số dư ledger. Tài khoản liên kết chỉ dùng để đối chiếu và liên kết giao dịch.</p>
          </div>
          <button type="button" data-instant-close aria-label="Đóng" className="grid size-9 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)]"><X className="size-4" /></button>
        </div>

        <form action={editing ? updateSavingsGoalAction : createSavingsGoalAction} className="mt-5 grid gap-4 md:grid-cols-2">
          {editing && <input type="hidden" name="goal_id" value={editing.id} />}
          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Tên mục tiêu</span>
            <input name="name" required maxLength={120} defaultValue={editing?.name ?? ""} placeholder="VD: Quỹ dự phòng 6 tháng" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
          </label>

          {editing ? (
            <div>
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Tiền tệ</span>
              <div className="flex h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 text-sm font-black">{editing.currency_code}</div>
              <input type="hidden" name="currency_code" value={editing.currency_code} />
            </div>
          ) : (
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Tiền tệ</span>
              <select name="currency_code" defaultValue="VND" required className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
                {currencies.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.symbol}</option>)}
              </select>
              <span className="mt-1 block text-[11px] text-[var(--muted-foreground)]">Nếu liên kết tài khoản, hãy chọn cùng tiền tệ.</span>
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Số tiền mục tiêu</span>
            <input name="target_amount" inputMode="decimal" required defaultValue={editing ? minorToMajorInput(editing.target_amount_minor, digits) : ""} placeholder={currency === "VND" ? "VD: 100000000" : "VD: 10000.00"} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Ngày mục tiêu</span>
            <input type="date" name="target_date" defaultValue={editing?.target_date ?? ""} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Tài khoản liên kết</span>
            <select name="linked_account_id" defaultValue={editing?.linked_account_id ?? ""} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
              <option value="">Không liên kết</option>
              {compatibleAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Mô tả</span>
            <textarea name="description" maxLength={500} defaultValue={editing?.description ?? ""} rows={3} placeholder="Mục đích, ghi chú hoặc kế hoạch cho mục tiêu này..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
          </label>

          <div className="md:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Icon</span>
            <CategoryIconPicker defaultValue={editing?.icon_name ?? "PiggyBank"} defaultColor={editing?.icon_color ?? "emerald"} />
          </div>

          <div className="flex justify-end gap-2 md:col-span-2">
            <button type="button" data-instant-close className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-black">Hủy</button>
            <PendingSubmitButton idleLabel={editing ? "Lưu mục tiêu" : "Tạo mục tiêu"} pendingLabel={editing ? "Đang lưu..." : "Đang tạo mục tiêu..."} className="h-10 rounded-xl bg-[var(--primary)] px-5 text-sm font-black text-white" />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function transactionLabel(transaction: TransactionView, goal: SavingsGoalProgress, digits: number) {
  const matching = transaction.entries.find((entry) => entry.currency_code === goal.currency_code && (!goal.linked_account_id || entry.account_id === goal.linked_account_id));
  if (!matching) return null;
  const sign = matching.amount_minor >= 0 ? "+" : "−";
  return `${transaction.transaction_date.split("-").reverse().join("/")} · ${transaction.title} · ${sign}${formatMinorMoney(Math.abs(matching.amount_minor), goal.currency_code, digits)}`;
}

function EntryForm({ goal, today, digits, transactions }: { goal: SavingsGoalProgress; today: string; digits: number; transactions: TransactionView[] }) {
  const candidates = transactions.map((transaction) => ({ transaction, label: transactionLabel(transaction, goal, digits) })).filter((item): item is { transaction: TransactionView; label: string } => Boolean(item.label));
  return (
    <Card className="border-emerald-500/25 shadow-2xl">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">Goal Progress</p><h2 className="mt-1 text-xl font-black">Ghi nhận · {goal.name}</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Đóng góp/rút tiền chỉ cập nhật tiến độ mục tiêu. Chọn Transaction nếu muốn đối chiếu với ledger thật.</p></div>
          <button type="button" data-instant-close aria-label="Đóng" className="grid size-9 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)]"><X className="size-4" /></button>
        </div>
        <form action={addSavingsGoalEntryAction} className="mt-5 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="goal_id" value={goal.id} />
          <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Loại</span><select name="entry_type" defaultValue="contribution" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="contribution">Đóng góp</option><option value="withdrawal">Rút khỏi mục tiêu</option><option value="adjustment">Điều chỉnh thủ công (+/-)</option></select></label>
          <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Ngày</span><input type="date" name="entry_date" required defaultValue={today} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" /></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Số tiền · {goal.currency_code}</span><input name="amount" inputMode="decimal" required placeholder={goal.currency_code === "VND" ? "VD: 5000000" : "VD: 500.00"} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" /><span className="mt-1 block text-[11px] text-[var(--muted-foreground)]">Với Điều chỉnh thủ công có thể nhập số âm để giảm tiến độ.</span></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Liên kết Transaction · tùy chọn</span><select name="transaction_id" defaultValue="" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="">Không liên kết</option>{candidates.slice(0, 50).map(({ transaction, label }) => <option key={transaction.id} value={transaction.id}>{label}</option>)}</select><span className="mt-1 block text-[11px] text-[var(--muted-foreground)]">Transaction phải cùng currency, đúng chiều tiền và nếu goal có tài khoản liên kết thì phải đi qua tài khoản đó.</span></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Ghi chú</span><input name="notes" maxLength={500} placeholder="VD: Trích lương tháng 10" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm" /></label>
          <div className="flex justify-end gap-2 md:col-span-2"><button type="button" data-instant-close className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-black">Hủy</button><PendingSubmitButton idleLabel="Ghi nhận" pendingLabel="Đang ghi nhận..." className="h-10 rounded-xl bg-[var(--primary)] px-5 text-sm font-black text-white" /></div>
        </form>
      </CardContent>
    </Card>
  );
}

export default async function GoalsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const [{ data: preferences }, { data: currencyRows }] = await Promise.all([
    supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle(),
    supabase.from("supported_currencies").select("code, decimal_digits, symbol").eq("is_active", true).order("code")
  ]);
  const defaultCurrency = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const today = todayInTimeZone(timeZone);
  const includeArchived = params.show === "archived";
  const [goalData, ledger] = await Promise.all([
    loadSavingsGoals(supabase, userId, includeArchived),
    loadLedger(supabase, userId, { limit: 150 })
  ]);
  const currencies = (currencyRows ?? []) as Currency[];
  const progress = savingsGoalProgress(goalData.goals, goalData.entries, goalData.accounts, today);
  const summary = savingsGoalSummary(progress, defaultCurrency);
  const defaultDigits = currencyDigits(currencies, defaultCurrency);
  const otherCurrencyCount = progress.filter((goal) => !goal.is_archived && goal.currency_code !== defaultCurrency).length;

  return (
    <div className="mx-auto max-w-[1450px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">Planning · Savings Goals</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Mục tiêu tiết kiệm</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">Biến kế hoạch thành mục tiêu đo được: theo dõi đóng góp, target date, số tiền còn thiếu và tốc độ cần tiết kiệm mỗi tháng mà không làm sai Transaction Ledger.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={includeArchived ? "/goals" : "/goals?show=archived"} className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-black">{includeArchived ? "Đang hoạt động" : "Đã lưu trữ"}</Link>
          <InstantReveal label="Mục tiêu mới"><GoalForm currencies={currencies} accounts={goalData.accounts} /></InstantReveal>
        </div>
      </div>

      <AuthMessage error={params.error} message={params.message} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent><Target className="size-5 text-[var(--primary)]" /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Mục tiêu · {defaultCurrency}</p><p className="mt-1 text-2xl font-black">{formatMinorMoney(summary.target, defaultCurrency, defaultDigits)}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">{summary.count} mục tiêu đang theo dõi</p></CardContent></Card>
        <Card><CardContent><PiggyBank className="size-5 text-emerald-500" /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Đã tiết kiệm</p><p className="mt-1 text-2xl font-black">{formatMinorMoney(summary.saved, defaultCurrency, defaultDigits)}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">{summary.percent}% tổng mục tiêu</p></CardContent></Card>
        <Card><CardContent><TrendingUp className="size-5 text-sky-500" /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Còn lại</p><p className="mt-1 text-2xl font-black">{formatMinorMoney(summary.remaining, defaultCurrency, defaultDigits)}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">{summary.completed} mục tiêu đã hoàn thành</p></CardContent></Card>
        <Card><CardContent><AlertTriangle className={`size-5 ${summary.attention > 0 ? "text-amber-500" : "text-emerald-500"}`} /><p className="mt-4 text-xs font-bold text-[var(--muted-foreground)]">Cần chú ý</p><p className="mt-1 text-2xl font-black">{summary.attention}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">{otherCurrencyCount > 0 ? `+ ${otherCurrencyCount} mục tiêu ở currency khác` : "Chậm tiến độ hoặc quá hạn"}</p></CardContent></Card>
      </div>

      {progress.length === 0 ? (
        <Card className="mt-5"><CardContent className="py-14 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--sidebar-accent)] text-[var(--primary)]"><PiggyBank className="size-6" /></div><h2 className="mt-4 text-lg font-black">Chưa có mục tiêu tiết kiệm</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted-foreground)]">Tạo mục tiêu đầu tiên như quỹ dự phòng, du lịch, mua thiết bị hoặc khoản tiền lớn bạn muốn chuẩn bị trước.</p><div className="mt-5 flex justify-center"><InstantReveal label="Tạo mục tiêu đầu tiên"><GoalForm currencies={currencies} accounts={goalData.accounts} /></InstantReveal></div></CardContent></Card>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {progress.map((goal) => {
            const digits = currencyDigits(currencies, goal.currency_code);
            const status = statusMeta(goal);
            const StatusIcon = status.Icon;
            const barPercent = Math.max(0, Math.min(100, goal.percent));
            return (
              <Card key={goal.id} className={goal.status === "completed" ? "border-emerald-500/25" : goal.status === "overdue" ? "border-rose-500/25" : undefined}>
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--sidebar-accent)]" style={{ color: iconColorValue(goal.icon_color) }}><CategoryIcon name={goal.icon_name} className="size-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h2 className="truncate text-lg font-black">{goal.name}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{goal.description || "Không có mô tả"}</p></div><span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide ${status.className}`}><StatusIcon className="size-3" /> {status.label}</span></div>
                      <div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-xs font-bold text-[var(--muted-foreground)]">Đã tiết kiệm</p><p className="mt-1 text-2xl font-black">{formatMinorMoney(goal.saved_minor, goal.currency_code, digits)}</p></div><div className="text-right"><p className="text-xs font-bold text-[var(--muted-foreground)]">Mục tiêu</p><p className="mt-1 text-sm font-black">{formatMinorMoney(goal.target_amount_minor, goal.currency_code, digits)}</p></div></div>
                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className={`h-full rounded-full ${goal.status === "completed" ? "bg-emerald-500" : goal.status === "overdue" ? "bg-rose-500" : goal.status === "behind" ? "bg-amber-500" : "bg-[var(--primary)]"}`} style={{ width: `${barPercent}%` }} /></div>
                      <div className="mt-2 flex justify-between gap-3 text-[11px] font-bold"><span>{goal.percent}%</span><span className="text-[var(--muted-foreground)]">Còn {formatMinorMoney(goal.remaining_minor, goal.currency_code, digits)}</span></div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-[var(--muted)] p-3"><div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--muted-foreground)]"><CalendarDays className="size-3.5" /> Target date</div><p className="mt-1.5 text-xs font-black">{viDate(goal.target_date)}</p></div>
                    <div className="rounded-xl bg-[var(--muted)] p-3"><div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--muted-foreground)]"><TrendingUp className="size-3.5" /> Cần / tháng</div><p className="mt-1.5 text-xs font-black">{goal.monthly_needed_minor === null ? "—" : formatMinorMoney(goal.monthly_needed_minor, goal.currency_code, digits)}</p></div>
                    <div className="rounded-xl bg-[var(--muted)] p-3"><div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--muted-foreground)]"><Clock3 className="size-3.5" /> Ước tính xong</div><p className="mt-1.5 text-xs font-black">{goal.estimated_completion_date ? viDate(goal.estimated_completion_date) : "Chưa đủ dữ liệu"}</p></div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted-foreground)]"><Link2 className="size-3.5" /><span>{goal.linked_account ? `Liên kết: ${goal.linked_account.name} · ${goal.linked_account.currency_code}` : "Không liên kết tài khoản"}</span></div>

                  {!goal.is_archived && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      <InstantReveal label="Ghi nhận" icon={false}><EntryForm goal={goal} today={today} digits={digits} transactions={ledger.transactions} /></InstantReveal>
                      <InstantReveal label="Sửa" icon={false}><GoalForm currencies={currencies} accounts={goalData.accounts} editing={goal} /></InstantReveal>
                      <form action={setSavingsGoalArchivedAction}><input type="hidden" name="goal_id" value={goal.id} /><input type="hidden" name="archived" value="true" /><PendingSubmitButton idleLabel="Lưu trữ" pendingLabel="Đang lưu trữ..." className="h-10 rounded-xl border border-[var(--border)] px-3.5 text-xs font-black" /></form>
                    </div>
                  )}
                  {goal.is_archived && <form action={setSavingsGoalArchivedAction} className="mt-5"><input type="hidden" name="goal_id" value={goal.id} /><input type="hidden" name="archived" value="false" /><PendingSubmitButton idleLabel="Khôi phục mục tiêu" pendingLabel="Đang khôi phục..." className="h-10 rounded-xl bg-[var(--primary)] px-4 text-xs font-black text-white" /></form>}

                  <div className="mt-5 border-t border-[var(--border)] pt-4">
                    <div className="flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">Lịch sử gần đây</h3><span className="text-[10px] text-[var(--muted-foreground)]">{goal.entries.length} mục</span></div>
                    {goal.entries.length === 0 ? <p className="mt-3 text-xs text-[var(--muted-foreground)]">Chưa có khoản đóng góp nào.</p> : <div className="mt-3 space-y-2">{goal.entries.slice(0, 4).map((entry) => <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><div className={`grid size-8 shrink-0 place-items-center rounded-lg ${entry.amount_minor >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>{entry.amount_minor >= 0 ? <TrendingUp className="size-3.5" /> : <RotateCcw className="size-3.5" />}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{entry.entry_type === "contribution" ? "Đóng góp" : entry.entry_type === "withdrawal" ? "Rút khỏi mục tiêu" : "Điều chỉnh"}{entry.transaction_id ? " · Linked Transaction" : ""}</p><p className="mt-0.5 truncate text-[10px] text-[var(--muted-foreground)]">{viDate(entry.entry_date)}{entry.notes ? ` · ${entry.notes}` : ""}</p></div><span className={`text-xs font-black ${entry.amount_minor < 0 ? "text-rose-500" : "text-emerald-500"}`}>{entry.amount_minor > 0 ? "+" : "−"}{formatMinorMoney(Math.abs(entry.amount_minor), goal.currency_code, digits)}</span>{!goal.is_archived && <form action={deleteSavingsGoalEntryAction}><input type="hidden" name="entry_id" value={entry.id} /><button type="submit" title="Xóa mục lịch sử" className="grid size-8 place-items-center rounded-lg text-[var(--muted-foreground)] hover:bg-rose-500/10 hover:text-rose-500"><Trash2 className="size-3.5" /></button></form>}</div>)}</div>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-5 border-sky-500/20"><CardContent className="p-5 text-sm leading-6 text-[var(--muted-foreground)]"><strong className="text-[var(--foreground)]">Nguyên tắc dữ liệu:</strong> Savings Goal là lớp lập kế hoạch/earmarking, không tự trừ tiền khỏi tài khoản. Muốn số dư thật thay đổi, hãy tạo Income/Expense/Transfer trong Transaction Core; sau đó có thể liên kết transaction phù hợp vào lịch sử mục tiêu để giữ trace giữa kế hoạch và ledger.</CardContent></Card>
    </div>
  );
}
