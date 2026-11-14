import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const css = read("app/globals.css");

test("V4.0.0 release keeps six standard modules, server RPC contracts and explicit version", () => {
  assert.equal(JSON.parse(read("package.json")).version, "4.2.1");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "4\.2\.1"/);
  assert.match(read("lib/app-version.ts"), /Premium UX Release|Fixed Mobile Chrome & Sheet Actions|Viewport-Locked Mobile Chrome & Keyboard Focus|Instant Launch Splash, Clean Sheet Grip & Today Spending|Category Drill-down Reports & Today Spending Disclosure|Full-screen Category Analytics & Instant Details|Compact Reports & Instant Period Navigation|Period Snapshot Type Safety Hotfix|Financial Accuracy & Release Gate|Release Gate Lint Compatibility|Financial Snapshot Type Safety Hotfix|Portable Test Runner CI Hotfix|Unified Fast Data Layer/);
  const modules = readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true }).filter(x=>x.isDirectory()).map(x=>x.name).sort();
  assert.deepEqual(modules, ["accounts", "categories", "overview", "reports", "settings", "transactions"]);
  const actions = read("features/transactions/actions.ts");
  for (const rpc of ["create_simple_transaction_v120", "update_simple_transaction_v120", "delete_simple_transaction_v120", "copy_simple_transaction_batch_v320"]) assert.ok(actions.includes(rpc));
});

test("V4 creates targeted skeletons instead of full-page spinners across the six-module app", () => {
  const skeleton=read("components/section-skeleton.tsx");
  assert.match(skeleton,/aria-busy="true"/);
  assert.match(skeleton,/fin-route-skeleton/);
  for(const key of ["accounts", "categories", "transactions", "settings"]) {
    assert.match(read(`app/(dashboard)/${key}/loading.tsx`),new RegExp(`SectionSkeleton kind="${key}"`));
  }
  assert.match(read("app/(dashboard)/reports/statements/loading.tsx"),/SectionSkeleton kind="statements"/);
  assert.match(read("components/app-splash.tsx"),/fin-page-shell:not\(\.fin-route-skeleton\)/);
});

test("V4 validates keypad money before RPC and focuses visible inline errors within the iPhone sheet", () => {
  const entry = read("components/transaction-entry-form.tsx");
  const reveal = read("components/transaction-form-visibility.ts");
  for(const fragment of ["validateTransactionAmounts", "onSubmit={onSubmit}", "event.preventDefault()", "onInvalidCapture", "role=\"alert\"", "focus({ preventScroll: true })", "revealTransactionFormTarget"]) assert.ok(entry.includes(fragment), fragment);
  for(const fragment of ["[data-fin-sheet-scroll]", "scrollRoot.scrollBy", "bottomLimit"]) assert.ok(reveal.includes(fragment), fragment);
  const module = pathToFileURL(join(root,"features/transactions/client-validation.ts")).href;
  const js = `import {validateTransactionAmounts as validate} from ${JSON.stringify(module)}; console.log(JSON.stringify([validate('income','','0',false),validate('expense','0','',false),validate('transfer','100','',false),validate('transfer','100','',true),validate('transfer','100','90',true),validate('income','','250000',false)]));`;
  const result = spawnSync(process.execPath,["--experimental-strip-types", "--input-type=module","-e",js], {encoding:"utf8"});
  assert.equal(result.status,0,result.stderr);
  const values = JSON.parse(result.stdout);
  assert.match(values[0], /số tiền thu/);
  assert.match(values[1], /số tiền chi/);
  assert.equal(values[2],null); // same-currency transfer can derive to_amount on server
  assert.match(values[3], /thực nhận/);
  assert.equal(values[4],null);
  assert.equal(values[5],null);
});

test("V4 keeps the page locked through closing motion and preserves safe-area Save", () => {
  const sheet=read("components/bottom-sheet.tsx");
  assert.match(sheet,/useOverlayScrollLock\(\(open \|\| present\) && portalReady\)/);
  assert.match(sheet,/visualViewport/);
  assert.match(sheet,/role="dialog" aria-modal="true"/);
  assert.match(sheet,/event\.key === "Escape"/);
  assert.match(css,/\.fin-transaction-sheet \.fin-transaction-savebar/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/\.fin-sheet-panel \{ max-height: min\(94dvh/);
});

test("V4 tiny-phone layouts retain accessible Copy/Edit/Delete targets and clear empty state",()=>{
  const list=read("components/transaction-list.tsx");
  assert.match(list,/fin-transaction-action grid size-10/);
  assert.match(list,/Chưa có giao dịch/);
  assert.match(list,/href="\/transactions\?new=expense"/);
  assert.match(css,/@media \(max-width: 390px\)/);
  assert.match(css,/\.fin-transaction-row > :nth-child\(4\) \{ grid-column: 2 \/ -1/);
});

test("V4 theme follows OS until user chooses, synchronizes across tabs and respects accessibility preferences",()=>{
  const theme=read("components/theme-toggle.tsx");
  assert.match(theme,/prefers-color-scheme: dark/);
  assert.match(theme,/preference\.addEventListener\("change", sync\)/);
  assert.match(theme,/window\.addEventListener\("storage", sync\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(prefers-contrast: more\)/);
  assert.match(css, /fin-v400-content-in/);
  assert.match(css, /\.fin-money-key:is\(:active,\[data-pressed="true"\]\) \{ transform: scale\(1\.14\)/);
});

test("V4 calendar supports arrow and Home/End navigation while preserving click-to-select", () => {
  const calendar=read("components/report-calendar-interactive.tsx");
  for(const token of ["onCalendarDayKeyDown", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "data-fin-calendar-date", "selectDay(target.date)"]) assert.ok(calendar.includes(token), token);
  assert.match(css,/\.fin-calendar-day:focus-visible \{ outline: 3px solid var\(--primary\)/);
});
