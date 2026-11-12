"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseMajorAmountToMinor } from "@/features/accounts/money";
import { isTransactionType } from "@/features/transactions/constants";
import { requireUser } from "@/lib/auth";
import { measureServerOperation } from "@/lib/performance";
import { transactionRpcError } from "@/features/transactions/rpc-response";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function safeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || !value.startsWith("/reports/calendar")) return "";
  return value;
}
function feedbackDestination(returnTo: string, kind: "message" | "error", message: string) {
  const safe = safeReturnTo(returnTo);
  const url = new URL(safe || "/transactions", "https://finzaro.local");
  url.searchParams.set(kind, message);
  return `${url.pathname}${url.search}${url.hash}`;
}
function dbError(error: unknown) {
  const value = error as { code?: string; message?: string } | null;
  if (value?.code === "PGRST202" || value?.message?.includes("_v120")) return "Chưa cập nhật database Finzaro V1.2.0. Hãy chạy SQL V1.2.0 trước khi thao tác.";
  return "Không thể ghi giao dịch. Vui lòng kiểm tra tài khoản, danh mục và số tiền.";
}
function invalidateSimpleLedger() {
  for (const path of ["/transactions", "/overview", "/accounts", "/reports", "/reports/calendar", "/reports/analysis"]) revalidatePath(path);
}

/** Save once through the existing atomic V1.2.0 RPC; never write account balances in the client. */
async function commitSimpleTransaction(formData: FormData) {
  const transactionType = text(formData, "transaction_type");
  const purpose = text(formData, "transaction_purpose");
  const categoryId = text(formData, "category_id") || null;
  const title = text(formData, "title");
  const notes = text(formData, "notes");
  const transactionDate = text(formData, "transaction_date");
  const fromAccountId = text(formData, "from_account_id") || null;
  const toAccountId = text(formData, "to_account_id") || null;
  if (!isTransactionType(transactionType)) throw new Error("Loại giao dịch không hợp lệ.");
  if (purpose !== (transactionType === "transfer" ? "transfer" : "standard")) throw new Error("Finzaro chỉ hỗ trợ Thu, Chi, Chuyển tiền thông thường.");
  if (title.length < 1 || title.length > 140) throw new Error("Nội dung giao dịch phải từ 1 đến 140 ký tự.");
  if (notes.length > 500) throw new Error("Ghi chú tối đa 500 ký tự.");
  if (!validDate(transactionDate)) throw new Error("Ngày giao dịch không hợp lệ.");
  if (transactionType !== "transfer" && !categoryId) throw new Error("Vui lòng chọn danh mục.");
  if ((transactionType === "expense" || transactionType === "transfer") && !fromAccountId) throw new Error("Vui lòng chọn tài khoản nguồn.");
  if ((transactionType === "income" || transactionType === "transfer") && !toAccountId) throw new Error("Vui lòng chọn tài khoản nhận.");
  if (transactionType === "transfer" && fromAccountId === toAccountId) throw new Error("Hai tài khoản chuyển tiền phải khác nhau.");
  // Reject hidden legacy payloads, even when the UI has no special-purpose controls.
  for (const key of ["credit_card_id", "loan_id", "deposit_id", "savings_goal_id", "new_loan_name", "loan_principal", "loan_interest", "loan_fee"]) {
    if (text(formData, key)) throw new Error("Giao dịch liên kết module tài chính nâng cao đã ngừng hỗ trợ.");
  }
  const { supabase, userId } = await requireUser();
  const accountIds = Array.from(new Set([fromAccountId, toAccountId].filter((id): id is string => Boolean(id))));
  const [accountResult, categoryResult, currencyResult] = await Promise.all([
    supabase.from("accounts").select("id, account_type, currency_code, is_archived").eq("user_id", userId).in("id", accountIds),
    categoryId && transactionType !== "transfer" ? supabase.from("categories").select("id, category_type, is_archived").eq("user_id", userId).eq("id", categoryId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("supported_currencies").select("code, decimal_digits").eq("is_active", true)
  ]);
  if (accountResult.error || !accountResult.data || accountResult.data.length !== accountIds.length) throw new Error("Không tìm thấy tài khoản.");
  if (accountResult.data.some((a) => a.is_archived || !["cash", "bank", "ewallet"].includes(a.account_type))) throw new Error("Chỉ sử dụng tiền mặt, ngân hàng hoặc ví điện tử đang hoạt động.");
  if (transactionType !== "transfer" && (categoryResult.error || !categoryResult.data || categoryResult.data.is_archived || categoryResult.data.category_type !== transactionType)) throw new Error("Danh mục không hợp lệ.");
  if (currencyResult.error || !currencyResult.data) throw new Error("Không tải được tiền tệ.");
  const accounts = new Map(accountResult.data.map(a => [a.id, a]));
  const decimals = new Map(currencyResult.data.map(c => [c.code, c.decimal_digits]));
  const fromAccount = fromAccountId ? accounts.get(fromAccountId) : null;
  const toAccount = toAccountId ? accounts.get(toAccountId) : null;
  const fromAmount = transactionType !== "income" ? parseMajorAmountToMinor(text(formData, "from_amount"), decimals.get(fromAccount?.currency_code ?? "") ?? 0) : null;
  let toAmount = transactionType !== "expense" ? parseMajorAmountToMinor(text(formData, "to_amount"), decimals.get(toAccount?.currency_code ?? "") ?? 0) : null;
  if (transactionType !== "income" && (!fromAmount || fromAmount <= 0)) throw new Error("Số tiền chi/chuyển không hợp lệ.");
  if (transactionType === "transfer" && !text(formData, "to_amount") && fromAccount?.currency_code === toAccount?.currency_code) toAmount = fromAmount;
  if (transactionType !== "expense" && (!toAmount || toAmount <= 0)) throw new Error("Số tiền nhận không hợp lệ.");
  if (transactionType === "transfer" && fromAccount?.currency_code === toAccount?.currency_code && fromAmount !== toAmount) throw new Error("Chuyển cùng loại tiền phải có giá trị gửi và nhận bằng nhau.");
  const error = transactionRpcError(await measureServerOperation("transaction.create.rpc", () => (supabase as any).rpc("create_simple_transaction_v120", {
    p_transaction_type: transactionType, p_title: title, p_category_id: categoryId,
    p_notes: notes || null, p_transaction_date: transactionDate,
    p_from_account_id: fromAccountId, p_to_account_id: toAccountId,
    p_from_amount_minor: fromAmount, p_to_amount_minor: toAmount
  })));
  if (error) throw new Error(dbError(error));
  invalidateSimpleLedger();
}

export type CreateTransactionState = { error: string };

/** Client action state: validation/RPC errors remain in the open form so user input is preserved. */
export async function createTransactionStateAction(
  _previous: CreateTransactionState,
  formData: FormData
): Promise<CreateTransactionState> {
  const returnTo = safeReturnTo(text(formData, "return_to"));
  try {
    await commitSimpleTransaction(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Không thể lưu giao dịch. Hãy thử lại." };
  }
  redirect(feedbackDestination(returnTo, "message", "Đã lưu giao dịch và cập nhật số dư."));
}

/** Redirect-based adapter retained for non-interactive callers. */
export async function createTransactionAction(formData: FormData) {
  const returnTo = safeReturnTo(text(formData, "return_to"));
  try {
    await commitSimpleTransaction(formData);
  } catch (error) {
    redirect(feedbackDestination(returnTo, "error", error instanceof Error ? error.message : "Không thể lưu giao dịch."));
  }
  redirect(feedbackDestination(returnTo, "message", "Đã lưu giao dịch và cập nhật số dư."));
}

/** V3.6.0: return a verified result so a disappearing list row can roll back on failure. */
export async function deleteTransactionInlineAction(transactionId: string): Promise<{ ok: boolean; error: string }> {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId)) {
      throw new Error("Mã giao dịch không hợp lệ.");
    }
    const { supabase } = await requireUser();
    const error = transactionRpcError(await measureServerOperation("transaction.delete.inline.rpc", () =>
      (supabase as any).rpc("delete_simple_transaction_v120", { p_transaction_id: transactionId })
    ));
    if (error) throw new Error(dbError(error));
    invalidateSimpleLedger();
    return { ok: true, error: "" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Không thể xóa giao dịch." };
  }
}

export async function deleteTransactionAction(formData: FormData) {
  const returnTo = safeReturnTo(text(formData, "return_to"));
  try {
    const id = text(formData, "transaction_id");
    if (!id) throw new Error("Thiếu mã giao dịch.");
    const { supabase } = await requireUser();
    const error = transactionRpcError(await measureServerOperation("transaction.delete.rpc", () => (supabase as any).rpc("delete_simple_transaction_v120", { p_transaction_id: id })));
    if (error) throw new Error(dbError(error));
    invalidateSimpleLedger();
    redirect(feedbackDestination(returnTo, "message", "Đã xóa giao dịch và hoàn nguyên số dư."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(feedbackDestination(returnTo, "error", error instanceof Error ? error.message : "Không thể xóa giao dịch."));
  }
}

export async function updateTransactionAction(formData: FormData) {
  const returnTo = safeReturnTo(text(formData, "return_to"));
  try {
    const transactionId = text(formData, "transaction_id");
    const title = text(formData, "title");
    const categoryId = text(formData, "category_id");
    const notes = text(formData, "notes");
    const date = text(formData, "transaction_date");
    const accountId = text(formData, "account_id");
    if (!transactionId || !categoryId || !accountId || !title || title.length > 140 || notes.length > 500 || !validDate(date)) throw new Error("Thông tin giao dịch không hợp lệ.");
    const { supabase, userId } = await requireUser();
    const [txResult, categoryResult, accountResult, currencyResult] = await Promise.all([
      supabase.from("transactions").select("transaction_type, transaction_purpose").eq("id", transactionId).eq("user_id", userId).maybeSingle(),
      supabase.from("categories").select("category_type, is_archived").eq("id", categoryId).eq("user_id", userId).maybeSingle(),
      supabase.from("accounts").select("currency_code, account_type, is_archived").eq("id", accountId).eq("user_id", userId).maybeSingle(),
      supabase.from("supported_currencies").select("code, decimal_digits").eq("is_active", true)
    ]);
    const tx = txResult.data;
    if (txResult.error || !tx || !["income", "expense"].includes(tx.transaction_type) || tx.transaction_purpose !== "standard") throw new Error("Chỉ sửa được giao dịch Thu/Chi thông thường.");
    if (categoryResult.error || !categoryResult.data || categoryResult.data.is_archived || categoryResult.data.category_type !== tx.transaction_type) throw new Error("Danh mục không hợp lệ.");
    // Keep the validated account in a local binding so TypeScript retains
    // non-null narrowing inside the currency lookup callback.
    const account = accountResult.data;
    if (accountResult.error || !account || account.is_archived || !["cash", "bank", "ewallet"].includes(account.account_type)) throw new Error("Tài khoản không hợp lệ.");
    if (currencyResult.error || !currencyResult.data) throw new Error("Không tìm thấy tiền tệ.");
    const digits = currencyResult.data.find(c => c.code === account.currency_code)?.decimal_digits;
    if (digits === undefined) throw new Error("Không tìm thấy tiền tệ.");
    const amount = parseMajorAmountToMinor(text(formData, "amount"), digits);
    if (!amount || amount <= 0) throw new Error("Số tiền không hợp lệ.");
    const error = transactionRpcError(await measureServerOperation("transaction.update.rpc", () => (supabase as any).rpc("update_simple_transaction_v120", {
      p_transaction_id: transactionId, p_title: title, p_category_id: categoryId, p_notes: notes || null,
      p_transaction_date: date, p_account_id: accountId, p_amount_minor: amount
    })));
    if (error) throw new Error(dbError(error));
    invalidateSimpleLedger();
    redirect(feedbackDestination(returnTo, "message", "Đã cập nhật giao dịch."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(feedbackDestination(returnTo, "error", error instanceof Error ? error.message : "Không thể sửa giao dịch."));
  }
}


type CopyTransactionReceipt = { date: string; transaction_id: string; reused: boolean };

/** Type guard for Supabase RPC results, including responses wrapped by telemetry. */
function isCopyTransactionReceipt(value: unknown): value is CopyTransactionReceipt {
  if (value === null || typeof value !== "object") return false;
  if (!("date" in value) || !("transaction_id" in value) || !("reused" in value)) return false;
  return typeof value.date === "string" && validDate(value.date)
    && typeof value.transaction_id === "string"
    && typeof value.reused === "boolean";
}
function isCopyTransactionReceipts(value: unknown): value is CopyTransactionReceipt[] {
  return Array.isArray(value) && value.every(isCopyTransactionReceipt);
}

export type CopyTransactionState = { error: string; copiedDates: string[] };

/** Atomic V3.2.0 batch copy: database receipts enforce idempotency across sessions/retries. */
export async function copyTransactionDatesAction(previous: CopyTransactionState, formData: FormData): Promise<CopyTransactionState> {
  const copiedDates = Array.isArray(previous.copiedDates) ? previous.copiedDates.filter(validDate) : [];
  let requested: string[];
  try {
    const raw: unknown = JSON.parse(text(formData, "dates"));
    if (!Array.isArray(raw) || raw.length < 1 || raw.length > 20 || !raw.every((item) => typeof item === "string" && validDate(item))) throw new Error("Ngày đích không hợp lệ.");
    requested = [...new Set(raw as string[])];
  } catch { return { error: "Vui lòng chọn từ 1 đến 20 ngày đích hợp lệ.", copiedDates }; }
  const remaining = requested.filter((date) => !copiedDates.includes(date));
  if (!remaining.length) return { error: "Các ngày đã chọn đều đã được sao chép.", copiedDates };
  const sourceId = text(formData, "source_id");
  if (!/^[0-9a-f-]{36}$/i.test(sourceId)) return { error: "Mã giao dịch gốc không hợp lệ.", copiedDates };

  try {
    // One RPC call for up to 20 days. PostgreSQL serializes concurrent requests
    // and returns receipts for prior successes rather than creating duplicates.
    const { supabase } = await requireUser();
    const result = await measureServerOperation("transaction.copy.batch.rpc", () =>
      (supabase as any).rpc("copy_simple_transaction_batch_v320", {
        p_source_id: sourceId,
        p_destination_dates: remaining
      })
    );
    const error = transactionRpcError(result) as { code?: string; message?: string } | null;
    if (error) {
      if (error.code === "PGRST202" || error.message?.includes("copy_simple_transaction_batch_v320")) {
        throw new Error("Chưa cập nhật database V3.2.0. Hãy chạy migration 20261111180000_instant_copy_batch_v320.sql.");
      }
      throw new Error(dbError(error));
    }
    // The measured RPC result is unknown until its response shape is checked.
    if (result === null || typeof result !== "object" || !("data" in result)) {
      throw new Error("Phản hồi sao chép từ database không hợp lệ. Kiểm tra lại trước khi thử tiếp.");
    }
    const receipts: unknown = result.data;
    if (!isCopyTransactionReceipts(receipts) || receipts.some((row) => !remaining.includes(row.date))) {
      throw new Error("Phản hồi sao chép từ database không hợp lệ. Kiểm tra lại trước khi thử tiếp.");
    }
    // A partial response is never silently treated as a success.
    if (receipts.length !== remaining.length || new Set(receipts.map((row) => row.date)).size !== remaining.length) throw new Error("Database chưa xác nhận đầy đủ ngày đã chọn.");
    const successful = [...new Set([...copiedDates, ...receipts.map((row) => row.date)])].sort();
    if (receipts.some((row) => !row.reused)) invalidateSimpleLedger();
    return { error: "", copiedDates: successful };
  } catch (error) {
    // The database function is atomic: failure rolls back the entire batch.
    return { error: error instanceof Error ? error.message : "Không thể sao chép giao dịch.", copiedDates };
  }
}
