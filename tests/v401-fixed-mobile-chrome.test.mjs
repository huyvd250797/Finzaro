import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = (name) => readFileSync(join(root, name), "utf8");
const css = source("app/globals.css");

test("V4.0.1 hotfix preserves modules and does not alter accounting actions", () => {
  assert.equal(JSON.parse(source("package.json")).version, "4.2.1");
  assert.match(source("lib/app-version.ts"), /APP_VERSION = "4\.2\.1"/);
  assert.deepEqual(readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true }).filter((item) => item.isDirectory()).map((item) => item.name).sort(), ["accounts", "categories", "overview", "reports", "settings", "transactions"]);
  for (const action of ["create_simple_transaction_v120", "update_simple_transaction_v120", "copy_simple_transaction_batch_v320"]) {
    assert.ok(source("features/transactions/actions.ts").includes(action));
  }
});

test("mobile navigation is portaled to body, pinned to visual viewport and hidden beneath open dialogs", () => {
  const nav = source("components/mobile-nav.tsx");
  assert.match(nav, /createPortal\(taskbar, document\.body\)/);
  assert.doesNotMatch(nav, /--fin-mobile-nav-bottom/);
  assert.match(nav, /The taskbar is fixed at CSS bottom: 0/);
  assert.match(nav, /window\.visualViewport/);
  assert.match(css, /\.fin-mobile-taskbar\s*\{[^}]*position: fixed !important;/s);
  assert.match(css, /body:has\(\.fin-sheet-backdrop\[data-fin-dialog="true"\]\) \.fin-mobile-taskbar/);
});

test("bottom sheets render action slot as a flex sibling AFTER scrollport", () => {
  const sheet = source("components/bottom-sheet.tsx");
  const scroll = sheet.indexOf('data-fin-sheet-scroll="true"');
  const slot = sheet.indexOf('data-fin-sheet-action-slot="true"');
  assert.ok(scroll !== -1 && slot > scroll);
  assert.match(sheet, /createContext<SheetFooterSlot \| null>/);
  assert.match(sheet, /useOverlayScrollLock\(\(open \|\| present\) && portalReady\)/);
  assert.match(css, /\.fin-sheet-action-slot:not\(:empty\)\s*\{[^}]*flex: 0 0 auto;/s);
  assert.match(css, /\.fin-sheet-action-slot \.fin-transaction-savebar,[\s\S]*?position: static !important;/);
});

test("transaction Save is associated to the actual form even after portaling actions", () => {
  const form = source("components/transaction-entry-form.tsx");
  const button = source("components/pending-submit-button.tsx");
  assert.match(form, /const formId = useId\(\)/);
  assert.match(form, /<form id=\{formId\} action=\{formAction\}/);
  assert.match(form, /createPortal\(saveActions, footerSlot\.element\)/);
  assert.match(form, /<PendingSubmitButton form=\{formId\}/);
  assert.match(button, /type="submit"\s+form=\{form\}/);
  assert.match(source("components/instant-transaction-launcher.tsx"), /activeFormKey=\{type\}/);
});

test("Copy, Account, Category and Calculator actions also anchor outside scroll", () => {
  const copy = source("components/transaction-copy-panel.tsx");
  const account = source("app/(dashboard)/accounts/page.tsx");
  const category = source("app/(dashboard)/categories/page.tsx");
  const calc = source("components/money-calculator-input.tsx");
  const actions = source("components/sheet-form-actions.tsx");
  assert.match(copy, /createPortal\(actions, footerSlot\.element\)/);
  assert.match(copy, /form=\{formId\}/);
  for (const v of [account, category]) {
    assert.match(v, /<SheetFormActions/);
    assert.match(v, /<PendingSubmitButton form=\{formId\}/);
  }
  assert.match(actions, /createPortal\(actions, footer\.element\)/);
  assert.match(calc, /<CalculatorFinishAction/);
  assert.match(calc, /createPortal\(action, footer\.element\)/);
});

test("only sheet content scrolls; keyboard focus can reach footer buttons", () => {
  assert.match(css, /\.fin-sheet-scroll\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.fin-sheet-action-slot:empty\s*\{\s*display:\s*none;/);
  assert.match(source("components/instant-reveal.tsx"), /closest<HTMLElement>\("\.fin-sheet-panel"\)/);
  assert.match(source("components/transaction-form-visibility.ts"), /rootRect\.bottom - 28/);
  assert.match(css, /max\(12px, env\(safe-area-inset-bottom\)\)/);
});
