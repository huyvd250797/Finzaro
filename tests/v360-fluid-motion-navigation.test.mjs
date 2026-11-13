import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const source = (name) => readFileSync(join(root,name), "utf8");
const pkg = JSON.parse(source("package.json"));
const css = source("app/globals.css");

test("V3.6.0 release: versioned full source, six standard modules and unchanged transaction RPC", () => {
  assert.equal(pkg.version, "4.1.4");
  assert.match(source("lib/app-version.ts"), /APP_VERSION = "4\.1\.4"/);
  assert.deepEqual(readdirSync(join(root,"app/(dashboard)"), { withFileTypes:true }).filter(x=>x.isDirectory()).map(x=>x.name).sort(),["accounts","categories","overview","reports","settings","transactions"]);
  const actions = source("features/transactions/actions.ts");
  for(const contract of ["create_simple_transaction_v120","update_simple_transaction_v120","delete_simple_transaction_v120","copy_simple_transaction_batch_v320"]) assert.ok(actions.includes(contract));
});

test("Smart navigation restores only safe filters and remembered scroll without persistent user storage", () => {
  const memory = source("components/navigation-memory.tsx");
  assert.match(memory,/rememberedRoutes = new Map/);
  assert.match(memory,/scrollOffsets = new Map/);
  assert.match(memory,/"\/reports\/calendar": \["period", "day"\]/);
  assert.match(memory,/"\/transactions": \["type", "account", "category", "from", "to", "q", "page", "legacy"\]/);
  assert.match(memory,/new URLSearchParams\(search\)/);
  assert.match(memory,/ResizeObserver/);
  assert.match(memory,/rememberedRoutes\.clear\(\)/);
  assert.doesNotMatch(memory,/\b(?:localStorage|sessionStorage)\.(?:getItem|setItem)\(/);
  assert.match(source("app/(dashboard)/layout.tsx"),/<NavigationMemory \/>/);
  for(const path of ["components/mobile-nav.tsx","components/app-sidebar.tsx","components/report-navigation.tsx"]) assert.match(source(path), /useSmartSectionRoutes/);
});

test("Fluid navigation progress is delayed and fails open rather than hanging", () => {
  const progress = source("components/navigation-progress.tsx");
  assert.match(progress,/setTimeout\(\(\) => setActive\(true\), 180\)/);
  assert.match(progress,/setTimeout\(\(\) => stopRef\.current\(\), 12000\)/);
  assert.match(progress,/next\.pathname === window\.location\.pathname && next\.search === window\.location\.search/);
  assert.match(progress,/anchor\.hasAttribute\("data-fin-copy-id"\)/);
});

test("Keypad visibly enlarges by 14 percent on press with fast tap feedback and accessibility fallback", () => {
  const keypad = source("components/money-calculator-input.tsx");
  assert.match(css,/\.fin-money-key:is\(:active,\[data-pressed="true"\]\) \{ transform: scale\(1\.14\)/);
  assert.match(keypad,/onPointerDown/);
  assert.match(keypad,/onPointerUp=\{\(event\) => releaseAfterTap/);
  assert.match(keypad,/data\.pressToken|dataset\.pressToken/);
  assert.match(keypad,/onPointerCancel/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css,/\.fin-money-key, \.fin-money-key:is\(:active,\[data-pressed="true"\]\) \{ transform: none/);
});

test("Bottom sheet retains portal above navigation, visual viewport handling, focus trap and safe swipe", () => {
  const sheet = source("components/bottom-sheet.tsx");
  for (const flag of ["createPortal", "visualViewport", "data-fin-sheet-scroll", "overscroll-y-contain", "role=\"dialog\"", "aria-modal=\"true\"", "event.key === \"Escape\"", "event.key !== \"Tab\"", "onPointerCancel", "pointercancel"]) assert.ok(sheet.includes(flag),flag);
  assert.match(sheet,/distance > 35 && distance \/ elapsed > \.75/);
  assert.match(source("components/instant-transaction-launcher.tsx"),/if \(!saving\(\)\) setType\(null\)/);
  assert.match(css,/\.fin-transaction-sheet \.fin-transaction-savebar/);
});

test("Optimistic delete always waits for server success and restores the row on failure", () => {
  const action = source("features/transactions/actions.ts");
  const control = source("components/transaction-delete-control.tsx");
  const list = source("components/transaction-list.tsx");
  assert.match(action,/export async function deleteTransactionInlineAction/);
  assert.match(action,/delete_simple_transaction_v120/);
  assert.match(action,/invalidateSimpleLedger\(\);\s*return \{ ok: true, error: "" \}/);
  assert.match(control,/row\?\.setAttribute\("data-fin-deleting", "true"\)/);
  assert.match(control,/if \(!result\.ok\) throw new Error/);
  assert.match(control,/row\?\.removeAttribute\("data-fin-deleting"\)/);
  assert.match(control,/router\.refresh\(\)/);
  assert.match(list,/TransactionDeleteControl transactionId=\{tx\.id\}/);
  assert.match(source("components/transaction-action-notice.tsx"),/role=\{status\.kind === "error" \? "alert" : "status"\}/);
});

test("Save and update show verified pending feedback without falsely changing accounting figures", () => {
  const button=source("components/pending-submit-button.tsx");
  assert.match(button,/useFormStatus/);
  assert.match(button,/aria-busy=\{pending\}/);
  assert.match(button,/data-fin-submit-pending/);
  assert.match(button,/aria-live="polite"/);
  assert.match(source("components/transaction-entry-form.tsx"),/createTransactionStateAction/);
});

test("Animations are transform/opacity oriented, natural gesture directions remain and reduced-motion is respected", () => {
  assert.match(css,/fin-v360-content-in/);
  assert.match(css,/translate3d\(0, 6px, 0\)/);
  assert.match(css,/\.fin-calendar-swipe \{ touch-action: auto; \}/);
  assert.match(css,/\.fin-sheet-scroll \{ scroll-behavior: auto; overscroll-behavior-y: contain; \}/);
  assert.match(css,/\.fin-page-shell \{ animation: none !important; \}/);
  assert.match(source("components/report-calendar-interactive.tsx"),/touch-auto snap-x snap-mandatory/);
});
