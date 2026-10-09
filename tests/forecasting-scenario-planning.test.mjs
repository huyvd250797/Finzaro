import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261007190000_forecasting_scenarios.sql");
const editor = read("supabase/sql-editor/V0.3.0_forecasting_scenarios.sql");
const page = read("app/(dashboard)/forecast/page.tsx");
const data = read("features/forecasting/data.ts");
const planner = read("components/scenario-planner.tsx");
const txForm = read("components/transaction-entry-form.tsx");
const dateInput = read("components/mobile-date-input.tsx");
const sidebar = read("components/app-sidebar.tsx");
const mobile = read("components/mobile-nav.tsx");
const version = read("lib/app-version.ts");

test("V0.3.0 creates persistent forecast scenarios with RLS", () => {
  assert.equal(migration, editor);
  assert.match(migration, /create table if not exists public\.forecast_scenarios/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /horizon_days in \(30, 90, 180, 365\)/i);
});

test("forecast engine combines known forward obligations and historical baseline", () => {
  assert.match(data, /projectRecurringOccurrences/);
  assert.match(data, /loanEvents/);
  assert.match(data, /cardEvents/);
  assert.match(data, /depositEvents/);
  assert.match(data, /first_shortfall_month/);
});

test("scenario planner supports realtime planning inputs", () => {
  assert.match(planner, /incomeAdjustPercent/);
  assert.match(planner, /expenseAdjustPercent/);
  assert.match(planner, /extraDebtMajor/);
  assert.match(planner, /savingsReserveMajor/);
  assert.match(planner, /saveForecastScenarioAction/);
});

test("forecast module is discoverable from desktop and mobile", () => {
  assert.match(page, /Forecasting & Scenario Planning/);
  assert.match(sidebar, /href: "\/forecast"/);
  assert.match(mobile, /href: "\/forecast"/);
});

test("quick transaction suggestions use responsive grid and styled date shell", () => {
  assert.match(txForm, /snap-x snap-mandatory/);
  assert.match(txForm, /slice\(0, 10\)/);
  assert.match(txForm, /MoneyCalculatorInput/);
  assert.match(txForm, /quick-suggestion-card/);
  assert.match(txForm, /MobileDateInput/);
  assert.match(dateInput, /type="date"/);
  assert.match(dateInput, /opacity-0/);
});

test("current app version is V0.7.1 Mobile Money UX + Debt Funding", () => {
  assert.match(version, /APP_VERSION = "0\.7\.1"/);
  assert.match(version, /Mobile Money UX \+ Debt Funding/);
});
