"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseMajorAmountToMinor } from "@/features/accounts/money";
import { isTransactionType } from "@/features/transactions/constants";
import { requireUser } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function destination(kind: "error" | "message", message: string) {
  return `/transactions?${new URLSearchParams({ [kind]: message }).toString()}`;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function safeDbMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const message = "message" in error ? String(error.message) : "";
  const known = [
    "Authentication required",
    "Invalid transaction type",
    "Transaction title",
    "Notes are too long",
    "Transaction date is required",
    "Category is required",
    "Category was not found",
    "Archived category",
    "Category type does not match",
    "Transfer does not use a category",
    "Destination account was not found",
    "Source account was not found",
    "Archived accounts",
    "Transfer requires two different accounts",
    "Transfer amounts",
    "One or more transfer accounts",
    "Transaction was not found"
  ];
  return known.some((item) => message.includes(item)) ? message : fallback;
}

export async function createTransactionAction(formData: FormData) {
  try {
    const transactionType = text(formData, "transaction_type");
    const title = text(formData, "title");
    const categoryId = text(formData, "category_id") || null;
    const notes = text(formData, "notes");
    const transactionDate = text(formData, "transaction_date");
    const fromAccountId = text(formData, "from_account_id") || null;
    const toAccountId = text(formData, "to_account_id") || null;
    const fromAmountInput = text(formData, "from_amount");
    const toAmountInput = text(formData, "to_amount");

    if (!isTransactionType(transactionType)) throw new Error("Loại giao dịch không hợp lệ.");
    if (title.length < 1 || title.length > 140) throw new Error("Nội dung giao dịch phải từ 1 đến 140 ký tự.");
    if (notes.length > 500) throw new Error("Ghi chú tối đa 500 ký tự.");
    if (!validDate(transactionDate)) throw new Error("Ngày giao dịch không hợp lệ.");
    if (transactionType !== "transfer" && !categoryId) throw new Error("Vui lòng chọn danh mục.");

    const { supabase, userId } = await requireUser();
    if (transactionType !== "transfer" && categoryId) {
      const { data: category, error: categoryError } = await supabase
        .from("categories")
        .select("id, category_type, is_archived")
        .eq("id", categoryId)
        .eq("user_id", userId)
        .maybeSingle();
      if (categoryError || !category || category.is_archived || category.category_type !== transactionType) {
        throw new Error("Danh mục không hợp lệ hoặc đã được lưu trữ.");
      }
    }

    const accountIds = Array.from(new Set([fromAccountId, toAccountId].filter((value): value is string => Boolean(value))));
    if (accountIds.length === 0) throw new Error("Vui lòng chọn tài khoản.");

    const [{ data: accounts, error: accountError }, { data: currencies, error: currencyError }] = await Promise.all([
      supabase.from("accounts").select("id, currency_code, is_archived").eq("user_id", userId).in("id", accountIds),
      supabase.from("supported_currencies").select("code, decimal_digits").eq("is_active", true)
    ]);

    if (accountError || !accounts || accounts.length !== accountIds.length) throw new Error("Không tìm thấy tài khoản hợp lệ.");
    if (currencyError || !currencies) throw new Error("Không thể đọc cấu hình tiền tệ.");
    const ownedAccounts = accounts as Array<{ id: string; currency_code: string; is_archived: boolean }>;
    const activeCurrencies = currencies as Array<{ code: string; decimal_digits: number }>;
    if (ownedAccounts.some((account) => account.is_archived)) throw new Error("Không thể tạo giao dịch trên tài khoản đã lưu trữ.");

    const accountById = new Map(ownedAccounts.map((account) => [account.id, account]));
    const digitsByCode = new Map(activeCurrencies.map((currency) => [currency.code, currency.decimal_digits]));
    let fromAmountMinor: number | null = null;
    let toAmountMinor: number | null = null;

    if (transactionType === "expense" || transactionType === "transfer") {
      if (!fromAccountId) throw new Error("Vui lòng chọn tài khoản nguồn.");
      const source = accountById.get(fromAccountId);
      if (!source) throw new Error("Tài khoản nguồn không hợp lệ.");
      fromAmountMinor = parseMajorAmountToMinor(fromAmountInput, digitsByCode.get(source.currency_code) ?? 0);
      if (fromAmountMinor === null || fromAmountMinor <= 0) throw new Error(`Số tiền nguồn không hợp lệ cho ${source.currency_code}.`);
    }

    if (transactionType === "income") {
      if (!toAccountId) throw new Error("Vui lòng chọn tài khoản nhận.");
      const destinationAccount = accountById.get(toAccountId);
      if (!destinationAccount) throw new Error("Tài khoản nhận không hợp lệ.");
      toAmountMinor = parseMajorAmountToMinor(toAmountInput, digitsByCode.get(destinationAccount.currency_code) ?? 0);
      if (toAmountMinor === null || toAmountMinor <= 0) throw new Error(`Số tiền không hợp lệ cho ${destinationAccount.currency_code}.`);
    }

    if (transactionType === "transfer") {
      if (!toAccountId || !fromAccountId || toAccountId === fromAccountId) throw new Error("Chuyển tiền cần hai tài khoản khác nhau.");
      const source = accountById.get(fromAccountId);
      const destinationAccount = accountById.get(toAccountId);
      if (!source || !destinationAccount) throw new Error("Tài khoản chuyển tiền không hợp lệ.");
      const effectiveToInput = toAmountInput || (source.currency_code === destinationAccount.currency_code ? fromAmountInput : "");
      toAmountMinor = parseMajorAmountToMinor(effectiveToInput, digitsByCode.get(destinationAccount.currency_code) ?? 0);
      if (toAmountMinor === null || toAmountMinor <= 0) {
        throw new Error(source.currency_code === destinationAccount.currency_code
          ? "Số tiền chuyển không hợp lệ."
          : `Chuyển khác tiền tệ cần nhập số tiền nhận bằng ${destinationAccount.currency_code}.`);
      }
    }

    const { error } = await supabase.rpc("create_financial_transaction_v005", {
      p_transaction_type: transactionType,
      p_title: title,
      p_category_id: transactionType === "transfer" ? null : categoryId,
      p_notes: notes || null,
      p_transaction_date: transactionDate,
      p_from_account_id: fromAccountId,
      p_to_account_id: toAccountId,
      p_from_amount_minor: fromAmountMinor,
      p_to_amount_minor: toAmountMinor
    });

    if (error) throw new Error(safeDbMessage(error, "Không thể tạo giao dịch. Vui lòng kiểm tra dữ liệu và thử lại."));

    revalidatePath("/transactions");
    revalidatePath("/overview");
    revalidatePath("/accounts");
    redirect(destination("message", "Đã ghi nhận giao dịch với Category Engine và cập nhật số dư."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", error instanceof Error ? error.message : "Không thể tạo giao dịch."));
  }
}

export async function deleteTransactionAction(formData: FormData) {
  const transactionId = text(formData, "transaction_id");
  if (!transactionId) redirect(destination("error", "Thiếu mã giao dịch."));

  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("delete_financial_transaction_v005", { p_transaction_id: transactionId });
    if (error) throw new Error(safeDbMessage(error, "Không thể xóa giao dịch."));

    revalidatePath("/transactions");
    revalidatePath("/overview");
    revalidatePath("/accounts");
    redirect(destination("message", "Đã xóa giao dịch và hoàn nguyên số dư."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", error instanceof Error ? error.message : "Không thể xóa giao dịch."));
  }
}


export async function updateTransactionAction(formData: FormData) {
  const transactionId = text(formData, "transaction_id");
  try {
    if (!transactionId) throw new Error("Thiếu mã giao dịch.");
    const title = text(formData, "title");
    const categoryId = text(formData, "category_id") || null;
    const notes = text(formData, "notes");
    const transactionDate = text(formData, "transaction_date");
    const accountId = text(formData, "account_id") || null;
    const amountInput = text(formData, "amount");
    if (title.length < 1 || title.length > 140) throw new Error("Nội dung giao dịch phải từ 1 đến 140 ký tự.");
    if (notes.length > 500) throw new Error("Ghi chú tối đa 500 ký tự.");
    if (!validDate(transactionDate)) throw new Error("Ngày giao dịch không hợp lệ.");
    if (!categoryId || !accountId) throw new Error("Vui lòng chọn danh mục và tài khoản.");

    const { supabase, userId } = await requireUser();
    const { data: transaction, error: transactionError } = await supabase.from("transactions").select("transaction_type").eq("id", transactionId).eq("user_id", userId).maybeSingle();
    if (transactionError || !transaction) throw new Error("Không tìm thấy giao dịch.");
    if (!['income','expense'].includes(transaction.transaction_type)) throw new Error("V0.0.12 chỉ cho phép sửa khoản thu/chi. Chuyển tiền vẫn giữ bất biến để bảo vệ ledger.");

    const [{ data: category, error: categoryError }, { data: account, error: accountError }] = await Promise.all([
      supabase.from("categories").select("category_type,is_archived").eq("id", categoryId).eq("user_id", userId).maybeSingle(),
      supabase.from("accounts").select("currency_code,is_archived").eq("id", accountId).eq("user_id", userId).maybeSingle()
    ]);
    if (categoryError || !category || category.is_archived || category.category_type !== transaction.transaction_type) throw new Error("Danh mục không hợp lệ hoặc đã lưu trữ.");
    if (accountError || !account || account.is_archived) throw new Error("Tài khoản không hợp lệ hoặc đã lưu trữ.");
    const { data: currencyConfig, error: currencyConfigError } = await supabase.from("supported_currencies").select("decimal_digits").eq("code", account.currency_code).maybeSingle();
    if (currencyConfigError || !currencyConfig) throw new Error("Không đọc được cấu hình tiền tệ.");
    const amountMinor = parseMajorAmountToMinor(amountInput, currencyConfig.decimal_digits);
    if (amountMinor === null || amountMinor <= 0) throw new Error(`Số tiền không hợp lệ cho ${account.currency_code}.`);

    const { error } = await (supabase as any).rpc("update_financial_transaction_v012", {
      p_transaction_id: transactionId, p_title: title, p_category_id: categoryId, p_notes: notes || null,
      p_transaction_date: transactionDate, p_account_id: accountId, p_amount_minor: amountMinor
    });
    if (error) throw new Error(safeDbMessage(error, error.message?.includes("linked to another financial module") ? "Giao dịch đang liên kết với module tài chính khác nên không thể sửa trực tiếp." : "Không thể cập nhật giao dịch."));
    revalidatePath("/transactions");
    revalidatePath("/overview");
    revalidatePath("/accounts");
    revalidatePath("/reports");
    revalidatePath("/budgets");
    redirect(destination("message", "Đã cập nhật khoản thu/chi và tính lại số dư tài khoản."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", error instanceof Error ? error.message : "Không thể cập nhật giao dịch."));
  }
}
