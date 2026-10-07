import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261007143000_loan_debt_manager.sql");
const sqlEditor = read("supabase/sql-editor/V0.0.11_loan_debt_manager.sql");
const actions = read("features/loans/actions.ts");
const data = read("features/loans/data.ts");
const page = read("app/(dashboard)/loans/page.tsx");
const simulator = read("components/loan-simulator.tsx");
const overview = read("app/(dashboard)/overview/page.tsx");
const mobile = read("components/mobile-nav.tsx");
const icons = read("features/categories/icons.tsx");
const layout = read("app/layout.tsx");
const iconPicker = read("components/category-icon-picker.tsx");
const css = read("app/globals.css");
const version = read("lib/app-version.ts");

test("V0.0.11 creates loans and payment history with per-user RLS", () => {
  assert.match(migration, /create table if not exists public\.loans/i);
  assert.match(migration, /create table if not exists public\.loan_payments/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /users can read own loans/i);
  assert.match(migration, /users can insert own loan payments/i);
  assert.equal(migration, sqlEditor);
});

test("loan DB validates account currency, principal ceiling and ledger payment traceability", () => {
  assert.match(migration, /validate_loan_v0011/);
  assert.match(migration, /Loan currency must match the linked account currency/);
  assert.match(migration, /validate_loan_payment_v0011/);
  assert.match(migration, /cannot exceed original principal/i);
  assert.match(migration, /Linked transaction does not match this loan currency\/account\/payment direction/);
  assert.match(migration, /guard_account_loan_archive_v0011/);
});

test("Loan engine exposes amortization, debt projection and extra-payment simulation", () => {
  assert.match(data, /amortizationSchedule/);
  assert.match(data, /annuity/);
  assert.match(data, /equal_principal/);
  assert.match(data, /interest_only/);
  assert.match(data, /biweekly/);
  assert.match(data, /weekly/);
  assert.match(data, /remaining_principal_minor/);
  assert.match(data, /simulateExtraMonthlyPayment/);
  assert.match(simulator, /Tiết kiệm lãi/);
});

test("Loan UI supports create edit archive payment history and schedule", () => {
  assert.match(actions, /createLoanAction/);
  assert.match(actions, /updateLoanAction/);
  assert.match(actions, /setLoanArchivedAction/);
  assert.match(actions, /addLoanPaymentAction/);
  assert.match(actions, /deleteLoanPaymentAction/);
  assert.match(page, /Khoản vay & dư nợ/);
  assert.match(page, /Lịch trả nợ dự kiến/);
  assert.match(page, /Ghi nhận thanh toán/);
  assert.match(page, /LoanSimulator/);
  assert.match(page, /payment_frequency/);
});

test("V0.0.11 expands icon library and stores selectable colors", () => {
  assert.match(icons, /CATEGORY_ICON_COLORS/);
  assert.match(icons, /CreditCard/);
  assert.match(icons, /Building2/);
  assert.match(icons, /ShoppingCart/);
  assert.match(migration, /add column if not exists icon_color/i);
  assert.match(iconPicker, /type="color"/);
});

test("mobile taskbar uses More bottom sheet and PWA viewport is locked", () => {
  assert.match(mobile, /Ellipsis/);
  assert.match(mobile, /Thêm module/);
  assert.match(mobile, /sheet-up/);
  assert.match(mobile, /\/loans/);
  assert.match(layout, /maximumScale: 1/);
  assert.match(layout, /userScalable: false/);
  assert.match(css, /overflow-x: hidden/);
  assert.match(css, /font-size: 16px !important/);
});

test("dashboard surfaces Loan & Debt summary", () => {
  assert.match(overview, /loadLoans/);
  assert.match(overview, /Khoản vay & dư nợ/);
  assert.match(overview, /loanSummary/);
});

test("current app version is V0.0.11 Loan & Debt Manager", () => {
  assert.match(version, /APP_VERSION = "0\.0\.11"/);
  assert.match(version, /Loan & Debt Manager/);
});
