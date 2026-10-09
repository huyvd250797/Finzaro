import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261007164000_net_worth_financial_position.sql");
const editor = read("supabase/sql-editor/V0.1.0_net_worth_financial_position.sql");
const page = read("app/(dashboard)/net-worth/page.tsx");
const data = read("features/net-worth/data.ts");
const actions = read("features/net-worth/actions.ts");
const mobile = read("components/mobile-nav.tsx");
const instant = read("components/instant-reveal.tsx");
const layout = read("app/layout.tsx");
const categoryPage = read("app/(dashboard)/categories/page.tsx");
const version = read("lib/app-version.ts");

 test("V0.1.0 creates user-owned Net Worth snapshots with RLS", () => {
  assert.equal(migration, editor);
  assert.match(migration, /create table if not exists public\.net_worth_snapshots/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /net_worth_snapshots_unique unique \(user_id, snapshot_date, currency_code\)/i);
  assert.match(migration, /net_worth_minor = total_assets_minor - total_liabilities_minor/i);
});

test("Financial Position derives assets and liabilities without counting Savings Goals twice", () => {
  assert.match(data, /account_assets_minor/);
  assert.match(data, /deposit_assets_minor/);
  assert.match(data, /loan_liabilities_minor/);
  assert.match(data, /credit_card_liabilities_minor/);
  assert.match(data, /net_worth_minor: netWorth/);
  assert.doesNotMatch(data, /loadSavingsGoals/);
  assert.match(page, /Không double-count Savings Goals/);
});

test("Net Worth UI supports currency separation, ratios and snapshots", () => {
  assert.match(page, /Tài sản ròng/);
  assert.match(page, /Debt \/ Assets/);
  assert.match(page, /Liquidity coverage/);
  assert.match(page, /Xu hướng tài sản ròng/);
  assert.match(actions, /saveNetWorthSnapshotAction/);
  assert.match(actions, /upsert/);
});

test("mobile taskbar restores central transaction button with two items on each side", () => {
  assert.match(mobile, /grid-cols-\[1fr_1fr_72px_1fr_1fr\]/);
  assert.match(mobile, /aria-label="Thêm giao dịch"/);
  assert.match(mobile, /Giao dịch/);
  assert.match(mobile, /Thêm/);
});

test("modal and bottom-sheet flows lock background scrolling", () => {
  assert.match(instant, /useOverlayScrollLock\(open\)/);
  assert.match(mobile, /useOverlayScrollLock\(Boolean\(sheet\)\)/);
  assert.match(instant, /overscroll-contain/);
});

test("category changes warn when historical transactions use the category", () => {
  assert.match(categoryPage, /ConfirmSubmitForm/);
  assert.match(categoryPage, /đang được sử dụng bởi/);
  assert.match(migration, /sync_transaction_category_label_v0100/);
  assert.match(migration, /drop constraint if exists categories_icon_allowed/);
});

test("saved theme is applied before splash paint", () => {
  assert.match(layout, /finzaro-theme/);
  assert.match(layout, /document\.documentElement\.classList\.toggle\('dark'/);
  assert.match(layout, /document\.documentElement\.style\.colorScheme/);
});

test("current feature release follows X.Y.Z at V0.3.0", () => {
  assert.match(version, /APP_VERSION = "0\.6\.0"/);
  assert.match(version, /Investment & Asset Tracking/);
});
