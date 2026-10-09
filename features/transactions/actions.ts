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
    "Transaction was not found",
    "Credit card",
    "credit card",
    "Loan",
    "loan",
    "payment",
    "liability",
    "savings account",
    "savings goal",
    "Cannot delete",
    "funding",
    "annual rate"
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
    const transactionPurpose = text(formData, "transaction_purpose") || "standard";
    const creditCardId = text(formData, "credit_card_id") || null;
    const loanId = text(formData, "loan_id") || null;
    const loanPrincipalInput = text(formData, "loan_principal");
    const loanInterestInput = text(formData, "loan_interest");
    const loanFeeInput = text(formData, "loan_fee");
    const newLoanName = text(formData, "new_loan_name");
    const newLoanLender = text(formData, "new_loan_lender_name");
    const newLoanRateInput = text(formData, "new_loan_annual_rate_percent").replace(/,/g, ".");
    const newLoanTermInput = text(formData, "new_loan_term_months");
    const newLoanFirstPaymentDate = text(formData, "new_loan_first_payment_date");
    const newLoanInterestMethod = text(formData, "new_loan_interest_method") || "annuity";
    const newLoanPaymentFrequency = text(formData, "new_loan_payment_frequency") || "monthly";
    const newLoanUpfrontFeeInput = text(formData, "new_loan_upfront_fee") || "0";

    if (!isTransactionType(transactionType)) throw new Error("Loại giao dịch không hợp lệ.");
    if (title.length < 1 || title.length > 140) throw new Error("Nội dung giao dịch phải từ 1 đến 140 ký tự.");
    if (notes.length > 500) throw new Error("Ghi chú tối đa 500 ký tự.");
    if (!validDate(transactionDate)) throw new Error("Ngày giao dịch không hợp lệ.");

    const expensePurposes = new Set(["standard", "credit_card_payment", "loan_payment"]);
    const incomePurposes = new Set(["standard", "credit_card_borrow", "loan_borrow"]);
    if (transactionType === "expense" && !expensePurposes.has(transactionPurpose)) throw new Error("Mục đích Chi tiền không hợp lệ.");
    if (transactionType === "income" && !incomePurposes.has(transactionPurpose)) throw new Error("Nguồn Thu nhập không hợp lệ.");
    if (transactionType === "transfer" && transactionPurpose !== "transfer") throw new Error("Mục đích Chuyển tiền không hợp lệ.");
    if (transactionType !== "transfer" && transactionPurpose === "standard" && !categoryId) throw new Error("Vui lòng chọn danh mục.");
    if (transactionPurpose === "credit_card_payment" && !creditCardId) throw new Error("Vui lòng chọn thẻ tín dụng cần thanh toán.");
    if (transactionPurpose === "loan_payment" && !loanId) throw new Error("Vui lòng chọn khoản vay cần thanh toán.");
    if (transactionPurpose === "credit_card_borrow" && !creditCardId) throw new Error("Vui lòng chọn thẻ tín dụng dùng làm nguồn tiền.");
    if (transactionPurpose === "loan_borrow") {
      const rate = Number(newLoanRateInput);
      const term = Number(newLoanTermInput);
      if (newLoanName.length < 1 || newLoanName.length > 120) throw new Error("Vui lòng nhập tên khoản vay từ 1 đến 120 ký tự.");
      if (!Number.isFinite(rate) || rate < 0 || rate > 100 || !/^\d+(?:\.\d{1,4})?$/.test(newLoanRateInput)) throw new Error("Lãi suất khoản vay phải từ 0 đến 100% và tối đa 4 chữ số thập phân.");
      if (!Number.isInteger(term) || term < 1 || term > 600) throw new Error("Thời hạn khoản vay phải từ 1 đến 600 tháng.");
      if (!validDate(newLoanFirstPaymentDate) || newLoanFirstPaymentDate < transactionDate) throw new Error("Ngày trả kỳ đầu phải bằng hoặc sau ngày giải ngân.");
      if (!["annuity", "equal_principal", "interest_only"].includes(newLoanInterestMethod)) throw new Error("Phương thức trả nợ không hợp lệ.");
      if (!["monthly", "biweekly", "weekly"].includes(newLoanPaymentFrequency)) throw new Error("Tần suất trả nợ không hợp lệ.");
    }

    const { supabase, userId } = await requireUser();
    if (transactionType !== "transfer" && transactionPurpose === "standard" && categoryId) {
      const { data: category, error: categoryError } = await supabase.from("categories").select("id, category_type, is_archived").eq("id", categoryId).eq("user_id", userId).maybeSingle();
      if (categoryError || !category || category.is_archived || category.category_type !== transactionType) throw new Error("Danh mục không hợp lệ hoặc đã được lưu trữ.");
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
    if (ownedAccounts.some((account) => account.is_archived)) throw new Error("Không thể tạo giao dịch trên tài khoản đã lưu trữ.");
    const accountById = new Map(ownedAccounts.map((account) => [account.id, account]));
    const digitsByCode = new Map((currencies as Array<{ code: string; decimal_digits: number }>).map((currency) => [currency.code, currency.decimal_digits]));

    let fromAmountMinor: number | null = null;
    let toAmountMinor: number | null = null;
    let loanPrincipalMinor: number | null = null;
    let loanInterestMinor: number | null = null;
    let loanFeeMinor: number | null = null;
    let newLoanUpfrontFeeMinor = 0;

    if (transactionType === "expense" || transactionType === "transfer") {
      if (!fromAccountId) throw new Error("Vui lòng chọn tài khoản nguồn.");
      const source = accountById.get(fromAccountId);
      if (!source) throw new Error("Tài khoản nguồn không hợp lệ.");
      const sourceDigits = digitsByCode.get(source.currency_code) ?? 0;
      fromAmountMinor = parseMajorAmountToMinor(fromAmountInput, sourceDigits);
      if (fromAmountMinor === null || fromAmountMinor <= 0) throw new Error(`Số tiền nguồn không hợp lệ cho ${source.currency_code}.`);
      if (transactionType === "expense" && transactionPurpose === "loan_payment") {
        loanPrincipalMinor = parseMajorAmountToMinor(loanPrincipalInput || "0", sourceDigits);
        loanInterestMinor = parseMajorAmountToMinor(loanInterestInput || "0", sourceDigits);
        loanFeeMinor = parseMajorAmountToMinor(loanFeeInput || "0", sourceDigits);
        if ([loanPrincipalMinor, loanInterestMinor, loanFeeMinor].some((value) => value === null || value! < 0)) throw new Error("Phân bổ gốc/lãi/phí khoản vay không hợp lệ.");
        if ((loanPrincipalMinor ?? 0) + (loanInterestMinor ?? 0) + (loanFeeMinor ?? 0) !== fromAmountMinor) throw new Error("Tổng gốc + lãi + phí phải bằng số tiền Chi tiền.");
      }
    }

    if (transactionType === "income") {
      if (!toAccountId) throw new Error("Vui lòng chọn tài khoản nhận.");
      const destinationAccount = accountById.get(toAccountId);
      if (!destinationAccount) throw new Error("Tài khoản nhận không hợp lệ.");
      const destinationDigits = digitsByCode.get(destinationAccount.currency_code) ?? 0;
      toAmountMinor = parseMajorAmountToMinor(toAmountInput, destinationDigits);
      if (toAmountMinor === null || toAmountMinor <= 0) throw new Error(`Số tiền không hợp lệ cho ${destinationAccount.currency_code}.`);
      if (transactionPurpose === "loan_borrow") {
        const parsedFee = parseMajorAmountToMinor(newLoanUpfrontFeeInput, destinationDigits);
        if (parsedFee === null || parsedFee < 0) throw new Error("Phí ban đầu khoản vay không hợp lệ.");
        newLoanUpfrontFeeMinor = parsedFee;
      }
    }

    if (transactionType === "transfer") {
      if (!toAccountId || !fromAccountId || toAccountId === fromAccountId) throw new Error("Chuyển tiền cần hai tài khoản khác nhau.");
      const source = accountById.get(fromAccountId);
      const destinationAccount = accountById.get(toAccountId);
      if (!source || !destinationAccount) throw new Error("Tài khoản chuyển tiền không hợp lệ.");
      const effectiveToInput = toAmountInput || (source.currency_code === destinationAccount.currency_code ? fromAmountInput : "");
      toAmountMinor = parseMajorAmountToMinor(effectiveToInput, digitsByCode.get(destinationAccount.currency_code) ?? 0);
      if (toAmountMinor === null || toAmountMinor <= 0) throw new Error(source.currency_code === destinationAccount.currency_code ? "Số tiền chuyển không hợp lệ." : `Chuyển khác tiền tệ cần nhập số tiền nhận bằng ${destinationAccount.currency_code}.`);
    }

    const { error } = await (supabase as any).rpc("create_financial_transaction_v071", {
      p_transaction_type: transactionType,
      p_title: title,
      p_category_id: transactionType === "transfer" || transactionPurpose !== "standard" ? null : categoryId,
      p_notes: notes || null,
      p_transaction_date: transactionDate,
      p_from_account_id: fromAccountId,
      p_to_account_id: toAccountId,
      p_from_amount_minor: fromAmountMinor,
      p_to_amount_minor: toAmountMinor,
      p_transaction_purpose: transactionType === "transfer" ? "transfer" : transactionPurpose,
      p_credit_card_id: transactionPurpose === "credit_card_payment" || transactionPurpose === "credit_card_borrow" ? creditCardId : null,
      p_loan_id: transactionPurpose === "loan_payment" ? loanId : null,
      p_loan_principal_minor: transactionPurpose === "loan_payment" ? loanPrincipalMinor : null,
      p_loan_interest_minor: transactionPurpose === "loan_payment" ? loanInterestMinor : null,
      p_loan_fee_minor: transactionPurpose === "loan_payment" ? loanFeeMinor : null,
      p_new_loan_name: transactionPurpose === "loan_borrow" ? newLoanName : null,
      p_new_loan_lender_name: transactionPurpose === "loan_borrow" ? newLoanLender || null : null,
      p_new_loan_annual_rate_percent: transactionPurpose === "loan_borrow" ? Number(newLoanRateInput) : null,
      p_new_loan_term_months: transactionPurpose === "loan_borrow" ? Number(newLoanTermInput) : null,
      p_new_loan_first_payment_date: transactionPurpose === "loan_borrow" ? newLoanFirstPaymentDate : null,
      p_new_loan_interest_method: transactionPurpose === "loan_borrow" ? newLoanInterestMethod : null,
      p_new_loan_payment_frequency: transactionPurpose === "loan_borrow" ? newLoanPaymentFrequency : null,
      p_new_loan_upfront_fee_minor: transactionPurpose === "loan_borrow" ? newLoanUpfrontFeeMinor : 0
    });
    if (error) throw new Error(safeDbMessage(error, "Không thể tạo giao dịch. Vui lòng kiểm tra dữ liệu và thử lại."));

    ["/transactions", "/overview", "/accounts", "/credit-cards", "/loans", "/goals", "/net-worth", "/debt-strategy", "/reports", "/health", "/forecast", "/cash-flow"].forEach(revalidatePath);
    const message = transactionPurpose === "credit_card_payment" ? "Đã chi tiền thanh toán thẻ và giảm dư nợ tín dụng."
      : transactionPurpose === "loan_payment" ? "Đã chi tiền thanh toán khoản vay và cập nhật dư nợ."
      : transactionPurpose === "credit_card_borrow" ? "Đã ghi nhận tiền vào tài khoản và tăng dư nợ thẻ tín dụng."
      : transactionPurpose === "loan_borrow" ? "Đã ghi nhận tiền giải ngân và tự tạo khoản vay mới."
      : transactionType === "transfer" ? "Đã chuyển tiền; mục tiêu liên kết (nếu có) đã tự đồng bộ."
      : "Đã ghi nhận giao dịch và cập nhật số dư.";
    redirect(destination("message", message));
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
    const { error } = await (supabase as any).rpc("delete_financial_transaction_v071", { p_transaction_id: transactionId });
    if (error) throw new Error(safeDbMessage(error, "Không thể xóa giao dịch."));
    ["/transactions", "/overview", "/accounts", "/credit-cards", "/loans", "/goals", "/net-worth", "/debt-strategy", "/reports", "/health", "/forecast", "/cash-flow"].forEach(revalidatePath);
    redirect(destination("message", "Đã xóa giao dịch và hoàn nguyên số dư/liability/goal liên quan."));
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
    const { data: transaction, error: transactionError } = await supabase.from("transactions").select("transaction_type, transaction_purpose").eq("id", transactionId).eq("user_id", userId).maybeSingle();
    if (transactionError || !transaction) throw new Error("Không tìm thấy giao dịch.");
    if (!['income','expense'].includes(transaction.transaction_type)) throw new Error("Chỉ cho phép sửa khoản thu/chi thông thường. Chuyển tiền vẫn giữ bất biến để bảo vệ ledger.");
    if ((transaction as any).transaction_purpose && (transaction as any).transaction_purpose !== 'standard') throw new Error("Khoản Chi tiền đang liên kết thẻ tín dụng/khoản vay. Hãy xóa và ghi lại để bảo vệ dữ liệu dư nợ.");

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
