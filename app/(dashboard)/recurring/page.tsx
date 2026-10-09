import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CirclePause,
  CirclePlay,
  Clock3,
} from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { MoneyCalculatorInput } from "@/components/money-calculator-input";
import { RecurringRuleLauncher } from "@/components/recurring-rule-launcher";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import {
  createRecurringRuleAction,
  postRecurringOccurrenceAction,
  setRecurringRuleActiveAction,
  undoRecurringOccurrenceAction
} from "@/features/recurring/actions";
import {
  loadRecurringData,
  monthBounds,
  monthDisplay,
  projectRecurringOccurrences,
  shiftMonth,
  todayInTimeZone,
  type RecurringProjectedOccurrence,
  type RecurringRule
} from "@/features/recurring/data";
import { currentMonthKey } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const metadata = { title: "Định kỳ & Lịch tài chính" };

type SearchParams = Promise<{ month?: string; error?: string; message?: string; show?: string }>;
type Account = { id: string; name: string; currency_code: string; is_archived: boolean };
type Category = { id: string; name: string; category_type: string; icon_name: string; icon_color: string | null; is_archived: boolean };
type Currency = { code: string; decimal_digits: number; symbol: string };

function frequencyLabel(rule: RecurringRule) {
  const every = rule.interval_count === 1 ? "" : `${rule.interval_count} `;
  if (rule.frequency === "weekly") return `Mỗi ${every}tuần`;
  if (rule.frequency === "yearly") return `Mỗi ${every}năm`;
  return `Mỗi ${every}tháng`;
}

function amountLabel(rule: RecurringRule, accounts: Account[], currencies: Currency[]) {
  const accountId = rule.transaction_type === "income" ? rule.to_account_id : rule.from_account_id;
  const account = accounts.find((item) => item.id === accountId);
  const amount = rule.transaction_type === "income" ? rule.to_amount_minor : rule.from_amount_minor;
  if (!account || amount == null) return "—";
  const digits = currencies.find((item) => item.code === account.currency_code)?.decimal_digits ?? 0;
  return formatMinorMoney(amount, account.currency_code, digits);
}

function RuleForm({
  type,
  accounts,
  categories,
  currencies,
  today
}: {
  type: "expense" | "income" | "transfer";
  accounts: Account[];
  categories: Category[];
  currencies: Currency[];
  today: string;
}) {
  const activeAccounts = accounts.filter((item) => !item.is_archived);
  const allowedCategories = categories.filter((item) => !item.is_archived && item.category_type === type);

  return (
    <Card className="mt-3 border-emerald-500/25">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">Recurring rule</p>
            <h2 className="mt-1 text-lg font-black">{type === "expense" ? "Khoản chi định kỳ" : type === "income" ? "Thu nhập định kỳ" : "Chuyển tiền định kỳ"}</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Finzaro chỉ tạo Transaction thật khi bạn bấm “Đã thanh toán/Đã nhận”, vì vậy lịch dự kiến không làm thay đổi số dư trước hạn.</p>
          </div>
          <button type="button" data-instant-close className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold">Đóng</button>
        </div>

        <form action={createRecurringRuleAction} className="mt-5 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="transaction_type" value={type} />
          <label className="block md:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tên</span><input name="title" required maxLength={140} placeholder={type === "expense" ? "VD: Tiền nhà" : type === "income" ? "VD: Lương hàng tháng" : "VD: Chuyển sang quỹ tiết kiệm"} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)]" /></label>

          {type !== "transfer" && <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Danh mục</span><select name="category_id" required className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="">Chọn danh mục</option>{allowedCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
          {(type === "expense" || type === "transfer") && <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tài khoản nguồn</span><select name="from_account_id" required className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="">Chọn tài khoản</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select></label>}
          {(type === "income" || type === "transfer") && <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">{type === "income" ? "Tài khoản nhận" : "Tài khoản đích"}</span><select name="to_account_id" required className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="">Chọn tài khoản</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select></label>}
          {(type === "expense" || type === "transfer") && <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">{type === "transfer" ? "Số tiền gửi" : "Số tiền"}</span><MoneyCalculatorInput name="from_amount" required decimalDigits={0} placeholder="0" /></label>}
          {(type === "income" || type === "transfer") && <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">{type === "transfer" ? "Số tiền nhận" : "Số tiền"}</span><MoneyCalculatorInput name="to_amount" required={type === "income"} allowEmpty={type === "transfer"} decimalDigits={0} placeholder={type === "transfer" ? "Để trống nếu cùng tiền tệ" : "0"} /></label>}

          <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Chu kỳ</span><select name="frequency" defaultValue="monthly" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="weekly">Tuần</option><option value="monthly">Tháng</option><option value="yearly">Năm</option></select></label>
          <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Lặp mỗi</span><div className="flex items-center gap-2"><input name="interval_count" type="number" min={1} max={52} defaultValue={1} required className="h-11 w-24 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" /><span className="text-xs text-[var(--muted-foreground)]">chu kỳ</span></div></label>
          <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Bắt đầu</span><input type="date" name="start_date" defaultValue={today} required className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" /></label>
          <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Kết thúc <span className="font-medium normal-case">(tùy chọn)</span></span><input type="date" name="end_date" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" /></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Ghi chú</span><textarea name="notes" maxLength={500} rows={2} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm" /></label>
          <div className="flex justify-end md:col-span-2"><PendingSubmitButton idleLabel="Tạo lịch định kỳ" pendingLabel="Đang tạo lịch..." className="h-10 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white" disabled={activeAccounts.length === 0 || (type !== "transfer" && allowedCategories.length === 0)} /></div>
        </form>
      </CardContent>
    </Card>
  );
}

function OccurrenceRow({ item, accounts, categories, currencies }: { key?: string; item: RecurringProjectedOccurrence; accounts: Account[]; categories: Category[]; currencies: Currency[] }) {
  const category = categories.find((candidate) => candidate.id === item.rule.category_id);
  const done = item.status === "paid" || item.status === "skipped";
  const statusText = item.status === "paid" ? "Đã ghi nhận" : item.status === "skipped" ? "Đã bỏ qua" : item.status === "overdue" ? "Quá hạn" : item.status === "due" ? "Đến hạn hôm nay" : "Sắp tới";
  const statusClass = item.status === "overdue" ? "text-rose-500 bg-rose-500/10" : item.status === "due" ? "text-amber-600 bg-amber-500/10" : item.status === "paid" ? "text-emerald-600 bg-emerald-500/10" : "text-[var(--muted-foreground)] bg-[var(--muted)]";
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] p-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--sidebar-accent)]" style={category ? { color: iconColorValue(category.icon_color) } : undefined}>{category ? <CategoryIcon name={category.icon_name} className="size-4" /> : <CalendarClock className="size-4" />}</div>
      <div className="min-w-[160px] flex-1"><p className="truncate text-sm font-bold">{item.rule.title}</p><p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{item.dueDate.split("-").reverse().join("/")} · {amountLabel(item.rule, accounts, currencies)}</p></div>
      <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${statusClass}`}>{statusText}</span>
      {!done ? <div className="ml-auto flex gap-2"><form action={postRecurringOccurrenceAction}><input type="hidden" name="rule_id" value={item.rule.id} /><input type="hidden" name="due_date" value={item.dueDate} /><input type="hidden" name="status" value="skipped" /><PendingSubmitButton idleLabel="Bỏ qua" pendingLabel="Đang lưu..." className="h-8 rounded-lg border border-[var(--border)] px-2.5 text-[11px] font-bold" /></form><form action={postRecurringOccurrenceAction}><input type="hidden" name="rule_id" value={item.rule.id} /><input type="hidden" name="due_date" value={item.dueDate} /><input type="hidden" name="status" value="paid" /><PendingSubmitButton idleLabel={item.rule.transaction_type === "income" ? "Đã nhận" : "Đã thanh toán"} pendingLabel="Đang ghi nhận..." className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[11px] font-bold text-white" /></form></div> : item.occurrence && <form action={undoRecurringOccurrenceAction} className="ml-auto"><input type="hidden" name="occurrence_id" value={item.occurrence.id} /><PendingSubmitButton idleLabel="Hoàn tác" pendingLabel="Đang hoàn tác..." className="h-8 rounded-lg border border-[var(--border)] px-2.5 text-[11px] font-bold" /></form>}
    </div>
  );
}

export default async function RecurringPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const [{ data: preferences }, { data: accountRows }, { data: categoryRows }, { data: currencyRows }, recurring] = await Promise.all([
    supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle(),
    supabase.from("accounts").select("id, name, currency_code, is_archived").eq("user_id", userId).order("name"),
    supabase.from("categories").select("id, name, category_type, icon_name, icon_color, is_archived").eq("user_id", userId).order("name"),
    supabase.from("supported_currencies").select("code, decimal_digits, symbol").eq("is_active", true),
    loadRecurringData(supabase, userId)
  ]);

  const accounts = (accountRows ?? []) as Account[];
  const categories = (categoryRows ?? []) as Category[];
  const currencies = (currencyRows ?? []) as Currency[];
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const today = todayInTimeZone(timeZone);
  const currentMonth = currentMonthKey(timeZone);
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : currentMonth;
  const bounds = monthBounds(month) ?? monthBounds(currentMonth)!;
  const monthItems = projectRecurringOccurrences(recurring.rules.filter((rule) => rule.is_active), recurring.occurrences, bounds.start, bounds.end, today);
  const next30End = new Date(`${today}T00:00:00Z`); next30End.setUTCDate(next30End.getUTCDate() + 30);
  const next30 = projectRecurringOccurrences(recurring.rules.filter((rule) => rule.is_active), recurring.occurrences, today, next30End.toISOString().slice(0, 10), today);
  const actionable = next30.filter((item) => !["paid", "skipped"].includes(item.status));
  const overdue = projectRecurringOccurrences(recurring.rules.filter((rule) => rule.is_active), recurring.occurrences, "2000-01-01", today, today).filter((item) => item.status === "overdue");
  const showPaused = params.show === "paused";
  const visibleRules = recurring.rules.filter((rule) => showPaused ? !rule.is_active : rule.is_active);

  const [year, monthNumber] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const byDay = new Map<number, RecurringProjectedOccurrence[]>();
  for (const item of monthItems) {
    const day = Number(item.dueDate.slice(8, 10));
    byDay.set(day, [...(byDay.get(day) ?? []), item]);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold text-[var(--primary)]">Planning · Automation</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Định kỳ & Lịch tài chính</h1><p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">Theo dõi các khoản lặp lại, khoản sắp đến hạn và chỉ tạo Transaction thật khi bạn xác nhận đã thanh toán/đã nhận.</p></div>
        <RecurringRuleLauncher expense={<RuleForm type="expense" accounts={accounts} categories={categories} currencies={currencies} today={today} />} income={<RuleForm type="income" accounts={accounts} categories={categories} currencies={currencies} today={today} />} transfer={<RuleForm type="transfer" accounts={accounts} categories={categories} currencies={currencies} today={today} />} />
      </div>

      <AuthMessage error={params.error} message={params.message} />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Lịch đang hoạt động</p><p className="mt-3 text-2xl font-black">{recurring.rules.filter((rule) => rule.is_active).length}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">30 ngày tới</p><p className="mt-3 text-2xl font-black">{actionable.length}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Quá hạn chưa xử lý</p><p className={`mt-3 text-2xl font-black ${overdue.length ? "text-rose-500" : "text-emerald-600"}`}>{overdue.length}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Đã xử lý kỳ này</p><p className="mt-3 text-2xl font-black">{monthItems.filter((item) => item.status === "paid" || item.status === "skipped").length}</p></CardContent></Card>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_.8fr]">
        <Card>
          <CardHeader><div><h2 className="font-black">Financial Calendar</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{monthDisplay(month)}</p></div><div className="flex gap-2"><Link href={`/recurring?month=${shiftMonth(month, -1)}`} className="grid size-9 place-items-center rounded-xl border border-[var(--border)]"><ArrowLeft className="size-4" /></Link><Link href={month === currentMonth ? "/recurring" : `/recurring?month=${currentMonth}`} className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] px-3 text-xs font-bold">Tháng này</Link><Link href={`/recurring?month=${shiftMonth(month, 1)}`} className="grid size-9 place-items-center rounded-xl border border-[var(--border)]"><ArrowRight className="size-4" /></Link></div></CardHeader>
          <CardContent>
            <div className="hidden grid-cols-7 gap-1 md:grid"><>{["CN","T2","T3","T4","T5","T6","T7"].map((label) => <div key={label} className="pb-2 text-center text-[10px] font-black uppercase text-[var(--muted-foreground)]">{label}</div>)}</>{Array.from({ length: firstWeekday }).map((_, index) => <div key={`blank-${index}`} className="min-h-24 rounded-xl bg-[var(--muted)]/30" />)}{Array.from({ length: daysInMonth }).map((_, index) => { const day = index + 1; const items = byDay.get(day) ?? []; const date = `${month}-${String(day).padStart(2,"0")}`; return <div key={day} className={`min-h-24 rounded-xl border p-2 ${date === today ? "border-emerald-500 bg-emerald-500/5" : "border-[var(--border)]"}`}><p className="text-[11px] font-black">{day}</p><div className="mt-1 space-y-1">{items.slice(0,3).map((item) => <div key={item.key} title={item.rule.title} className={`truncate rounded-md px-1.5 py-1 text-[9px] font-bold ${item.status === "overdue" ? "bg-rose-500/10 text-rose-500" : item.status === "paid" ? "bg-emerald-500/10 text-emerald-600" : item.status === "skipped" ? "bg-[var(--muted)] text-[var(--muted-foreground)]" : "bg-[var(--sidebar-accent)] text-[var(--primary)]"}`}>{item.rule.title}</div>)}{items.length > 3 && <p className="text-[9px] text-[var(--muted-foreground)]">+{items.length - 3}</p>}</div></div>; })}</div>
            <div className="space-y-2 md:hidden">{monthItems.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">Không có lịch định kỳ trong tháng này.</div> : monthItems.map((item) => <OccurrenceRow key={item.key} item={item} accounts={accounts} categories={categories} currencies={currencies} />)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><h2 className="font-black">Cần xử lý</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Quá hạn + 30 ngày tới</p></div><Clock3 className="size-4 text-[var(--primary)]" /></CardHeader>
          <CardContent className="space-y-2">{[...overdue, ...actionable].filter((item, index, all) => all.findIndex((candidate) => candidate.key === item.key) === index).slice(0,10).map((item) => <OccurrenceRow key={item.key} item={item} accounts={accounts} categories={categories} currencies={currencies} />)}{overdue.length + actionable.length === 0 && <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center"><CheckCircle2 className="mx-auto size-6 text-emerald-600" /><p className="mt-2 text-sm font-bold">Không có khoản cần xử lý</p></div>}</CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><div><h2 className="font-black">Quy tắc định kỳ</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{visibleRules.length} {showPaused ? "đang tạm dừng" : "đang hoạt động"}</p></div><Link href={showPaused ? "/recurring" : "/recurring?show=paused"} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold">{showPaused ? <CirclePlay className="size-3.5" /> : <CirclePause className="size-3.5" />}{showPaused ? "Đang hoạt động" : "Đã tạm dừng"}</Link></CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">{visibleRules.length === 0 ? <div className="col-span-full rounded-xl border border-dashed border-[var(--border)] p-7 text-center text-sm text-[var(--muted-foreground)]">Chưa có lịch trong nhóm này.</div> : visibleRules.map((rule) => { const category = categories.find((item) => item.id === rule.category_id); return <div key={rule.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-4"><div className="grid size-11 place-items-center rounded-xl bg-[var(--sidebar-accent)]" style={category ? { color: iconColorValue(category.icon_color) } : undefined}>{category ? <CategoryIcon name={category.icon_name} className="size-4.5" /> : <CalendarClock className="size-4.5" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{rule.title}</p><p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{frequencyLabel(rule)} · từ {rule.start_date.split("-").reverse().join("/")} · {amountLabel(rule, accounts, currencies)}</p></div><form action={setRecurringRuleActiveAction}><input type="hidden" name="rule_id" value={rule.id} /><input type="hidden" name="active" value={rule.is_active ? "false" : "true"} /><PendingSubmitButton idleLabel={rule.is_active ? "Tạm dừng" : "Kích hoạt"} pendingLabel="Đang lưu..." className="h-8 rounded-lg border border-[var(--border)] px-2.5 text-[11px] font-bold" /></form></div>; })}</CardContent>
      </Card>
    </div>
  );
}
