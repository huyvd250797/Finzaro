import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261008143000_smart_cash_flow_planner.sql");
const editor = read("supabase/sql-editor/V0.4.0_smart_cash_flow_planner.sql");
const page = read("app/(dashboard)/cash-flow/page.tsx");
const planner = read("components/cash-flow-planner.tsx");
const money = read("components/money-calculator-input.tsx");
const txForm = read("components/transaction-entry-form.tsx");
const txData = read("features/transactions/data.ts");
const sidebar = read("components/app-sidebar.tsx");
const mobile = read("components/mobile-nav.tsx");
const version = read("lib/app-version.ts");

test("V0.4.0 creates cash flow plans with RLS", () => {
  assert.equal(migration, editor);
  assert.match(migration, /create table if not exists public\.cash_flow_plans/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /minimum_cash_buffer_minor/i);
});

test("Smart Cash Flow Planner exposes safe-to-spend planning", () => {
  assert.match(page, /Smart Cash Flow Planner/);
  assert.match(planner, /Safe to Spend/);
  assert.match(planner, /fixed_obligations_minor/);
  assert.match(planner, /savings_reserve/);
  assert.match(planner, /extra_debt_payment/);
  assert.match(planner, /minimum_cash_buffer/);
});

test("transaction quick suggestions show two horizontal cards and cap at ten", () => {
  assert.match(txForm, /snap-x snap-mandatory/);
  assert.match(txForm, /calc\(50%_-_4px\)/);
  assert.match(txForm, /slice\(0, 10\)/);
  assert.match(txData, /limit = 10/);
});

test("money calculator keeps dot decimal input while displaying Vietnamese money grouping", () => {
  assert.match(money, /groupedWhole/);
  assert.match(money, /fraction !== undefined \? `,\$\{fraction\}`/);
  assert.doesNotMatch(money, /Intl\.NumberFormat\("vi-VN"/);
  assert.match(money, /Máy tính số tiền/);
  assert.match(money, /chooseOperator/);
  assert.match(money, /equals/);
  assert.match(money, /createPortal/);
  assert.match(money, /bottom-0/);
  assert.match(money, />Xong</);
});

test("Cash Flow Planner is discoverable from desktop and mobile navigation", () => {
  assert.match(sidebar, /href: "\/cash-flow"/);
  assert.match(mobile, /href: "\/cash-flow"/);
});

test("current app version is V0.8.0 Release Candidate", () => {
  assert.match(version, /APP_VERSION = "0\.8\.0"/);
  assert.match(version, /Release Candidate/);
});


test("money calculator does not import unavailable Lucide Backspace icon", () => {
  const source = read("components/money-calculator-input.tsx");
  assert.doesNotMatch(source, /import\s*\{[^}]*\bBackspace\b[^}]*\}\s*from\s*["']lucide-react["']/);
  assert.match(source, /aria-label="Xóa một chữ số"/);
});
