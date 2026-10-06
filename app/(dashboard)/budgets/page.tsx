import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Copy,
  Gauge,
  Pencil,
  Plus,
  RotateCcw,
  Target,
  X
} from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { minorToMajorInput } from "@/features/accounts/money";
import {
  copyPreviousMonthBudgetsAction,
  createBudgetAction,
  setBudgetArchivedAction,
  updateBudgetAction
} from "@/features/budgets/actions";
import {
  budgetProgress,
  budgetSummary,
  currencyDecimalDigits,
  loadBudgets,
  monthEndFromKey,
  monthLabel,
  monthStartFromKey,
  normalizeMonthKey,
  shiftMonthKey,
  type BudgetProgress
} from "@/features/budgets/data";
import { categoryPath, loadCategories, type CategoryRow } from "@/features/categories/data";
import { CategoryIcon } from "@/features/categories/icons";
import { currentMonthKey, loadLedger } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const metadata = { title: "Ngân sách" };

type SearchParams = Promise<{
  month?: string;
  new?: string;
  edit?: string;
  show?: string;
  error?: string;
  message?: string;
}>;

function BudgetForm({
  month,
  categories,
  currencies,
  defaultCurrency,
  editing
}: {
  month: string;
  categories: CategoryRow[];
  currencies: Array<{ code: string; decimal_digits: number; symbol: string }>;
  defaultCurrency: string;
  editing?: BudgetProgress | null;
}) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const expenseCategories = categories.filter((category) => category.category_type === "expense" && !category.is_archived);
  const editingDigits = editing ? currencyDecimalDigits(currencies, editing.currency_code) : 0;

  return (
    <Card className="mt-5 border-emerald-500/25">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">Budget Engine</p>
            <h2 className="mt-1 text-lg font-black">{editing ? `Sửa ngân sách ${editing.category.name}` : `Thiết lập ngân sách ${monthLabel(month)}`}</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Ngân sách danh mục cha tự động tính cả chi tiêu của các subcategory bên dưới.</p>
          </div>
          <Link href={`/budgets?month=${month}`} aria-label="Đóng" className="grid size-9 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)]"><X className="size-4" /></Link>
        </div>

        <form action={editing ? updateBudgetAction : createBudgetAction} className="mt-5 grid gap-4 md:grid-cols-3">
          <input type="hidden" name="month" value={month} />
          {editing && <input type="hidden" name="budget_id" value={editing.id} />}

          {editing ? (
            <div className="md:col-span-2">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Danh mục</span>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 text-sm font-semibold">
                <CategoryIcon name={editing.category.icon_name} className="size-4 text-[var(--primary)]" />
                {categoryPath(editing.category, categoryById)}
              </div>
            </div>
          ) : (
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Danh mục chi tiêu</span>
              <select name="category_id" required className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
                <option value="">Chọn danh mục...</option>
                {expenseCategories.map((category) => <option key={category.id} value={category.id}>{categoryPath(category, categoryById)}</option>)}
              </select>
            </label>
          )}

          {editing ? (
            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tiền tệ</span>
              <div className="flex h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 text-sm font-bold">{editing.currency_code}</div>
            </div>
          ) : (
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tiền tệ</span>
              <select name="currency_code" defaultValue={defaultCurrency} required className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
                {currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} · {currency.symbol}</option>)}
              </select>
            </label>
          )}

          <label className="block md:col-span-3">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Hạn mức ngân sách</span>
            <input
              name="amount"
              inputMode="decimal"
              required
              defaultValue={editing ? minorToMajorInput(editing.amount_minor, editingDigits) : ""}
              placeholder={defaultCurrency === "VND" ? "VD: 5000000" : "VD: 500.00"}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
            />
          </label>

          <div className="flex justify-end gap-2 md:col-span-3">
            <Link href={`/budgets?month=${month}`} className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] px-4 text-sm font-bold">Hủy</Link>
            <button type="submit" className="inline-flex h-10 items-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white">{editing ? "Lưu hạn mức" : "Tạo ngân sách"}</button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ item }: { item: BudgetProgress }) {
  if (item.status === "over") return <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-rose-500"><AlertTriangle className="size-3" /> Vượt ngân sách</span>;
  if (item.status === "near") return <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-500"><Gauge className="size-3" /> Gần giới hạn</span>;
  return <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-500"><CheckCircle2 className="size-3" /> Trong kế hoạch</span>;
}

export default async function BudgetsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const defaultCurrency = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const currentKey = currentMonthKey(timeZone);
  const month = normalizeMonthKey(params.month, currentKey);
  const monthStart = monthStartFromKey(month);
  const includeArchived = params.show === "archived";

  const [categories, budgets, ledger] = await Promise.all([
    loadCategories(supabase, userId, true),
    loadBudgets(supabase, userId, monthStart, includeArchived),
    loadLedger(supabase, userId, { fromDate: monthStart, toDate: monthEndFromKey(month), limit: 5000 })
  ]);

  const progress = budgetProgress(budgets, ledger.transactions, categories);
  const activeProgress = progress.filter((item) => !item.is_archived);
  const summary = budgetSummary(activeProgress, defaultCurrency);
  const defaultDigits = currencyDecimalDigits(ledger.currencies, defaultCurrency);
  const editing = params.edit ? progress.find((item) => item.id === params.edit) ?? null : null;
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const currencyCodes = Array.from(new Set(progress.map((item) => item.currency_code))).sort((a, b) => (a === defaultCurrency ? -1 : b === defaultCurrency ? 1 : a.localeCompare(b)));

  return (
    <div className="mx-auto max-w-[1350px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">Planning · Budget Engine</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Ngân sách</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">Thiết lập hạn mức theo category/tháng và đối chiếu trực tiếp với Expense thật từ Transaction Ledger. Danh mục cha bao gồm toàn bộ chi tiêu của subcategory.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={copyPreviousMonthBudgetsAction}>
            <input type="hidden" name="month" value={month} />
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm font-bold"><Copy className="size-4" /> Sao chép tháng trước</button>
          </form>
          <Link href={`/budgets?month=${month}&new=1`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white"><Plus className="size-4" /> Ngân sách mới</Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
        <Link href={`/budgets?month=${shiftMonthKey(month, -1)}`} aria-label="Tháng trước" className="grid size-10 place-items-center rounded-xl border border-[var(--border)]"><ArrowLeft className="size-4" /></Link>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--muted-foreground)]">Kỳ ngân sách</p>
          <p className="mt-0.5 flex items-center justify-center gap-2 text-sm font-black capitalize"><CalendarRange className="size-4 text-[var(--primary)]" /> {monthLabel(month)}</p>
        </div>
        <div className="flex gap-2">
          {month !== currentKey && <Link href={`/budgets?month=${currentKey}`} className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] px-3 text-xs font-bold">Tháng này</Link>}
          <Link href={`/budgets?month=${shiftMonthKey(month, 1)}`} aria-label="Tháng sau" className="grid size-10 place-items-center rounded-xl border border-[var(--border)]"><ArrowRight className="size-4" /></Link>
        </div>
      </div>

      <AuthMessage error={params.error} message={params.message} />
      {(params.new === "1" || editing) && <BudgetForm month={month} categories={categories} currencies={ledger.currencies} defaultCurrency={defaultCurrency} editing={editing} />}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Đã phân bổ · {defaultCurrency}</p><p className="mt-3 text-2xl font-black">{formatMinorMoney(summary.allocated, defaultCurrency, defaultDigits)}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{summary.count} ngân sách đang hoạt động</p></CardContent></Card>
        <Card><CardContent><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Đã chi · {defaultCurrency}</p><p className="mt-3 text-2xl font-black">{formatMinorMoney(summary.actual, defaultCurrency, defaultDigits)}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Tính từ Expense ledger trong phạm vi ngân sách</p></CardContent></Card>
        <Card><CardContent><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Còn lại · {defaultCurrency}</p><p className="mt-3 text-2xl font-black text-emerald-500">{formatMinorMoney(summary.remaining, defaultCurrency, defaultDigits)}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Không cộng phần âm của ngân sách đã vượt</p></CardContent></Card>
        <Card><CardContent><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Cảnh báo</p><p className={`mt-3 text-2xl font-black ${summary.overCount > 0 ? "text-rose-500" : summary.nearCount > 0 ? "text-amber-500" : "text-emerald-500"}`}>{summary.overCount > 0 ? `${summary.overCount} vượt` : summary.nearCount > 0 ? `${summary.nearCount} gần giới hạn` : "Ổn định"}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Ngưỡng cảnh báo gần giới hạn từ 80%</p></CardContent></Card>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">Theo dõi danh mục</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Không cho tạo ngân sách cha/con chồng lấp trong cùng tháng và cùng tiền tệ để tránh double-count.</p>
        </div>
        <Link href={includeArchived ? `/budgets?month=${month}` : `/budgets?month=${month}&show=archived`} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-bold">{includeArchived ? <Target className="size-3.5" /> : <Archive className="size-3.5" />} {includeArchived ? "Đang hoạt động" : "Xem lưu trữ"}</Link>
      </div>

      {progress.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="p-10 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--sidebar-accent)] text-[var(--primary)]"><Target className="size-5" /></div>
            <h3 className="mt-4 font-black">Chưa có ngân sách cho {monthLabel(month)}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted-foreground)]">Tạo hạn mức theo category hoặc sao chép từ tháng trước. Actual Spending sẽ được tính tự động từ giao dịch chi tiêu thật.</p>
            <Link href={`/budgets?month=${month}&new=1`} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white"><Plus className="size-4" /> Tạo ngân sách đầu tiên</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 space-y-5">
          {currencyCodes.map((currencyCode) => {
            const rows = progress.filter((item) => item.currency_code === currencyCode);
            const digits = currencyDecimalDigits(ledger.currencies, currencyCode);
            return (
              <section key={currencyCode}>
                <div className="mb-3 flex items-center gap-2"><span className="rounded-lg bg-[var(--muted)] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide">{currencyCode}</span><span className="text-xs text-[var(--muted-foreground)]">{rows.length} ngân sách</span></div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {rows.map((item) => {
                    const barWidth = Math.min(100, Math.max(0, item.percent));
                    return (
                      <Card key={item.id} className={item.is_archived ? "opacity-60" : ""}>
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--sidebar-accent)] text-[var(--primary)]"><CategoryIcon name={item.category.icon_name} className="size-5" /></div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-black">{item.category.name}</h3>{item.is_archived && <span className="rounded-md bg-[var(--muted)] px-1.5 py-0.5 text-[9px] font-black uppercase text-[var(--muted-foreground)]">Lưu trữ</span>}</div>
                              <p className="mt-0.5 truncate text-[11px] text-[var(--muted-foreground)]">{categoryPath(item.category, categoryById)}{item.scope_category_ids.length > 1 ? ` · gồm ${item.scope_category_ids.length - 1} subcategory` : ""}</p>
                            </div>
                            {!item.is_archived && <StatusBadge item={item} />}
                          </div>

                          <div className="mt-5 flex items-end justify-between gap-3">
                            <div><p className="text-xs text-[var(--muted-foreground)]">Đã chi</p><p className="mt-1 text-lg font-black">{formatMinorMoney(item.actual_minor, currencyCode, digits)}</p></div>
                            <div className="text-right"><p className="text-xs text-[var(--muted-foreground)]">Hạn mức</p><p className="mt-1 text-sm font-bold">{formatMinorMoney(item.amount_minor, currencyCode, digits)}</p></div>
                          </div>

                          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className={`h-full rounded-full ${item.status === "over" ? "bg-rose-500" : item.status === "near" ? "bg-amber-500" : "bg-[var(--primary)]"}`} style={{ width: `${barWidth}%` }} /></div>
                          <div className="mt-2 flex items-center justify-between text-xs"><span className={`font-black ${item.status === "over" ? "text-rose-500" : item.status === "near" ? "text-amber-500" : "text-[var(--primary)]"}`}>{item.percent.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%</span><span className={item.remaining_minor < 0 ? "font-bold text-rose-500" : "text-[var(--muted-foreground)]"}>{item.remaining_minor < 0 ? `Vượt ${formatMinorMoney(Math.abs(item.remaining_minor), currencyCode, digits)}` : `Còn ${formatMinorMoney(item.remaining_minor, currencyCode, digits)}`}</span></div>

                          <div className="mt-4 flex justify-end gap-2 border-t border-[var(--border)] pt-3">
                            {!item.is_archived && <Link href={`/budgets?month=${month}&edit=${item.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold"><Pencil className="size-3.5" /> Sửa</Link>}
                            <form action={setBudgetArchivedAction}>
                              <input type="hidden" name="budget_id" value={item.id} /><input type="hidden" name="month" value={month} /><input type="hidden" name="archived" value={item.is_archived ? "false" : "true"} />
                              <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold text-[var(--muted-foreground)]">{item.is_archived ? <RotateCcw className="size-3.5" /> : <Archive className="size-3.5" />}{item.is_archived ? "Khôi phục" : "Lưu trữ"}</button>
                            </form>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
