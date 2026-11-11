import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("Current release metadata remains consistent across package and visible app version", () => {
  assert.ok(Number(JSON.parse(read("package.json")).version.split(".")[1]) >= 2, "release should retain V2.2 baseline");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "2\.[2-9]\.\d+"/);
  assert.match(read("lib/app-version.ts"), /Financial Dashboard & Advanced Reports|Premium Fintech & Fluid Transaction UX/);
});

test("The branded splash is mounted once in root layout, before initial PWA app content", () => {
  const rootLayout = read("app/layout.tsx");
  assert.match(rootLayout, /import \{ AppSplash \}/);
  assert.match(rootLayout, /<body>\s*<AppSplash \/>/);
  const splash = read("components/app-splash.tsx");
  assert.match(splash, /useState\(true\)/);
  assert.match(splash, /setVisible\(false\)/);
  assert.match(splash, /finzaro-splash/);
});

test("Copy calendar marks source, planned and completed dates distinctly, even across months", () => {
  const panel = read("components/transaction-copy-panel.tsx");
  assert.match(panel, /useState\(sourceDate\.slice\(0, 7\)\)/);
  assert.match(panel, /const isSource = date === sourceDate/);
  assert.match(panel, /const isCopied = copied\.has\(date\)/);
  assert.match(panel, /const isSelected = dates\.includes\(date\)/);
  assert.match(panel, /bg-violet-500/);
  assert.match(panel, /bg-sky-600/);
  assert.match(panel, /bg-emerald-500/);
  assert.match(panel, /aria-pressed=\{isSelected\}/);
  assert.match(panel, /disabled=\{pending \|\| isCopied\}/);
  assert.doesNotMatch(panel, /date === sourceDate\) return;/);
});

test("Category selector limits height to four rows but keeps touch scrolling and reordering", () => {
  const css = read("app/globals.css");
  const category = read("components/transaction-category-select.tsx");
  assert.match(css, /\.fin-category-scroll\s*\{[\s\S]*?max-height: 336px/);
  assert.match(css, /overflow-y: auto/);
  assert.match(category, /auto-rows-\[78px\]/);
  assert.match(category, /fin-category-scroll grid/);
  assert.match(category, /beginPress/);
  assert.match(category, /reorderCategoriesAction/);
});

test("Transaction history day headers are independent native collapsible groups, open by default", () => {
  const list = read("components/transaction-list.tsx");
  assert.match(list, /<details key=\{date\} open/);
  assert.match(list, /<summary className=/);
  assert.match(list, /group-open\/day:rotate-180/);
  assert.match(list, /rows\.map\(\(tx\) => <TransactionRow/);
});

test("Calendar swipe action retains horizontal gestures while vertical gestures scroll naturally", () => {
  const calendar = read("components/report-calendar-interactive.tsx");
  assert.match(calendar, /overflow-x-auto overscroll-x-contain overscroll-y-auto touch-auto snap-x/);
  assert.doesNotMatch(calendar, /touch-pan-x/);
  const css = read("app/globals.css");
  assert.match(css, /#calendar-day-detail \[class\*="overflow-x-auto"\] \{ touch-action: auto; \}/);
  assert.match(css, /overscroll-behavior-y: auto/);
  const sheet = read("components/bottom-sheet.tsx");
  assert.match(sheet, /overflow-y-auto overscroll-x-contain overscroll-y-contain touch-pan-y/);
});
