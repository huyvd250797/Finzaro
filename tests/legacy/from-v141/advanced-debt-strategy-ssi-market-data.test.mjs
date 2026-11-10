import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20261009113000_advanced_debt_strategy_ssi_market_data.sql");
const editor = read("supabase/sql-editor/V0.7.0_advanced_debt_strategy_ssi_market_data.sql");
const debtData = read("features/debt-strategy/data.ts");
const debtPage = read("app/(dashboard)/debt-strategy/page.tsx");
const debtPlanner = read("components/debt-strategy-planner.tsx");
const assetsPage = read("app/(dashboard)/assets/page.tsx");
const ssiRoute = read("app/api/market/ssi/refresh/route.ts");
const ssiClient = read("lib/market-data/ssi.ts");
const env = read(".env.example");
const pkg = JSON.parse(read("package.json"));

// Keep SQL Editor and canonical migration identical.
test("V0.7.0 migration is identical to SQL Editor script", () => {
  assert.equal(migration, editor);
});

test("Advanced Debt Strategy persists plan and supports Avalanche/Snowball", () => {
  assert.match(migration, /create table if not exists public\.debt_strategy_plans/i);
  assert.match(migration, /strategy in \('avalanche','snowball'\)/i);
  assert.match(debtData, /simulateDebtStrategy/);
  assert.match(debtData, /simulateMinimumOnly/);
  assert.match(debtData, /annual_rate_percent/);
  assert.match(debtPlanner, /Avalanche/);
  assert.match(debtPlanner, /Snowball/);
  assert.match(debtPage, /buildStrategyDebts/);
});

test("Stock holdings support ticker, average buy price and automated SSI valuation", () => {
  assert.match(migration, /ticker_symbol/);
  assert.match(migration, /average_buy_price_minor/);
  assert.match(migration, /market_price_minor/);
  assert.match(migration, /auto_price_enabled/);
  assert.match(assetsPage, /Giá mua bình quân/);
  assert.match(assetsPage, /SSI FastConnect/);
  assert.match(ssiRoute, /fetchSsiQuotes/);
  assert.match(ssiClient, /getSecuritiesSummary/);
});

test("SSI credentials remain server-only and SDK is pinned", () => {
  assert.equal(pkg.dependencies["@ssi.developer/ssi-sdk"], "3.2.1");
  assert.match(env, /SSI_FASTCONNECT_API_KEY=/);
  assert.match(env, /SSI_FASTCONNECT_API_SECRET=/);
  assert.doesNotMatch(env, /NEXT_PUBLIC_SSI_FASTCONNECT/);
  assert.match(ssiClient, /server-only/);
});

test("automated SSI refresh throttles valuation history to one row per day", () => {
  assert.match(migration, /record_asset_valuation_v070/);
  assert.match(migration, /notes = v_note/);
  assert.match(migration, /update public\.asset_valuations/);
});


test("SSI market pricing normalizes thousand-VND quotation units before P/L", () => {
  assert.match(ssiClient, /normalizeSsiPriceToVnd/);
  assert.match(ssiClient, /Math\.abs\(value\) < 1_000 \? value \* 1_000 : value/);
});
