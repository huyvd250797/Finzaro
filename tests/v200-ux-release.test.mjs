import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const version = read("lib/app-version.ts");

const expectedRoutes = ["accounts", "categories", "overview", "reports", "settings", "transactions"];

test("V2.0.0 single release synchronizes version, API, PWA and visible mobile + desktop UI", () => {
  assert.ok((Number(JSON.parse(read("package.json")).version.split(".")[0]) > 2 || Number(JSON.parse(read("package.json")).version.split(".")[1]) >= 2), "release should retain V2.2 baseline");
  assert.match(version, /APP_VERSION = "(?:2\.[2-9]\.\d+|(?:3|4)\.\d+\.\d+)"/);
  assert.match(version, /APP_RELEASE_NAME = "(?:Premium Fintech & Fluid Transaction UX|Financial Dashboard & Advanced Reports|Professional Release · Scale, Motion & Accessibility|Instant Reports, Fast Copy & Splash|Premium Visual Foundation|Mobile-First Transaction UX|Premium Overview & Reports|Fluid Motion & Navigation|Premium UX Release|Fixed Mobile Chrome & Sheet Actions|Viewport-Locked Mobile Chrome & Keyboard Focus|Instant Launch Splash, Clean Sheet Grip & Today Spending|Category Drill-down Reports & Today Spending Disclosure|Full-screen Category Analytics & Instant Details|Compact Reports & Instant Period Navigation|Period Snapshot Type Safety Hotfix|Financial Accuracy & Release Gate|Release Gate Lint Compatibility|Financial Snapshot Type Safety Hotfix|Portable Test Runner CI Hotfix|Unified Fast Data Layer|Report RPC Type Safety & Deploy Hotfix)"/);
  for (const file of ["components/app-header.tsx", "components/app-sidebar.tsx", "components/mobile-nav.tsx", "app/(dashboard)/settings/page.tsx", "app/api/version/route.ts", "components/pwa-register.tsx"]) assert.match(read(file), /APP_VERSION/);
  assert.match(read("components/app-header.tsx"), /fin-version-pill inline-flex/);
  assert.doesNotMatch(read("components/app-header.tsx"), /hidden sm:inline-flex/);
  assert.match(read("components/mobile-nav.tsx"), /<BottomSheet open=\{Boolean\(sheet\)\}/);
});

test("Exactly six dashboard modules, with no retired routes or diagnostic-only type shims", () => {
  assert.deepEqual(readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(), expectedRoutes);
  assert.equal(existsSync(join(root, "_diagnostic_only_external_shims.d.ts")), false);
  assert.match(read("scripts/sync-retired-source.mjs"), /RETIRED_DIRS/);
  assert.match(read("scripts/sync-retired-source.mjs"), /_diagnostic_only_external_shims\.d\.ts/);
  assert.match(read("package.json"), /"prebuild"/);
});

test("Accounts has client-side search, type filters, sort and direct transaction history links", () => {
  const code = read("components/account-collection.tsx");
  assert.match(code, /useDeferredValue\(query\)/);
  assert.match(code, /Tìm tài khoản hoặc ví/);
  for (const type of ["bank", "cash", "ewallet"]) assert.ok(code.includes(`id: "${type}"`));
  assert.match(code, /sort === "balance"/);
  assert.match(code, /\/transactions\?account=/);
  assert.match(code, /formatMinorMoney\(/);
  assert.match(read("app/(dashboard)/accounts/page.tsx"), /<AccountCollection/);
  assert.doesNotMatch(code, /\.from\("accounts"\)/);
});

test("Category reorder is pointer-captured, cancel-safe, keyboard-accessible and restored on errors", () => {
  const grid = read("components/category-manager-grid.tsx");
  for (const pattern of [/setPointerCapture/, /releasePointerCapture/, /onPointerCancel=\{cancelDrag\}/, /aria-label=\{`Đưa/, /aria-live="polite"/, /router\.refresh\(\)/, /persistOrder\(/]) assert.match(grid, pattern);
  const actions = read("features/categories/actions.ts");
  assert.match(actions, /const oldOrder = new Map/);
  assert.match(actions, /Promise\.allSettled\(ids\.map/);
  assert.match(read("app/(dashboard)/categories/page.tsx"), /showArchived \? category\.is_archived : !category\.is_archived/);
});

test("Pure category reorder is immutable and rejects invalid moves", () => {
  const req = createRequire(import.meta.url);
  let ts;
  try { ts = req("typescript"); } catch { ts = req("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript"); }
  const compiled = ts.transpileModule(read("features/categories/order.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", compiled)(mod, mod.exports);
  const { moveCategoryItem } = mod.exports;
  const source = ["food", "rent", "travel"];
  assert.deepEqual(moveCategoryItem(source, 0, 2), ["rent", "travel", "food"]);
  assert.deepEqual(moveCategoryItem(source, 1, 0), ["rent", "food", "travel"]);
  assert.deepEqual(moveCategoryItem(source, -1, 1), source);
  assert.deepEqual(source, ["food", "rent", "travel"]);
  assert.notEqual(moveCategoryItem(source, 0, 0), source);
});

test("UX release preserves zoom, keyboard focus, reduced motion and PWA update recovery", () => {
  const app = read("app/layout.tsx");
  assert.doesNotMatch(app, /userScalable:\s*false|maximumScale:\s*1/);
  const instant = read("components/instant-reveal.tsx");
  for (const pattern of [/<BottomSheet/, /event\.key !== "Tab"/, /event\.key === "Escape"/, /(?:triggerRef\.current|trigger)\?\.focus\(\)/]) assert.match(instant, pattern);
  assert.match(read("components/bottom-sheet.tsx"), /aria-modal="true"/);
  const css = read("app/globals.css");
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /fin-account-card/);
  assert.match(css, /fin-category-tile-dragging/);
  const sw = read("public/sw.js");
  assert.match(sw, /Promise\.allSettled\(\[\.\.\.REQUIRED_SHELL, \.\.\.OPTIONAL_SHELL\]/);
  assert.match(sw, /event\.request\.mode === "navigate"/);
  assert.match(sw, /cache: "no-store"/);
  assert.match(read("components/pwa-register.tsx"), /checkServerVersion/);
});

test("No V2.0 database migration or specialized finance reactivation", () => {
  for (const sql of readdirSync(join(root, "supabase/migrations"))) assert.ok(!sql.includes("v200"), `Unexpected DB migration: ${sql}`);
  const action = read("features/transactions/actions.ts");
  for (const rpc of ["create_simple_transaction_v120", "update_simple_transaction_v120", "delete_simple_transaction_v120"]) assert.ok(action.includes(rpc));
  const sidebar = read("components/app-sidebar.tsx");
  for (const path of ["/loans", "/credit-cards", "/deposits", "/assets"]) assert.ok(!sidebar.includes(path));
});
