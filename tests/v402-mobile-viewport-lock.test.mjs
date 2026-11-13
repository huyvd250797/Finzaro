import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const file = (path) => readFileSync(join(root, path), "utf8");
const css = file("app/globals.css");

test("V4.0.2 release preserves 6 modules, finance RPCs and database semantics", () => {
  assert.equal(JSON.parse(file("package.json")).version, "4.1.1");
  assert.match(file("lib/app-version.ts"), /APP_VERSION = "4\.1\.1"/);
  assert.deepEqual(readdirSync(join(root,"app/(dashboard)"), { withFileTypes:true })
    .filter((item) => item.isDirectory()).map((item) => item.name).sort(),
    ["accounts", "categories", "overview", "reports", "settings", "transactions"]);
  const actions = file("features/transactions/actions.ts");
  for (const rpc of ["create_simple_transaction_v120", "update_simple_transaction_v120", "delete_simple_transaction_v120", "copy_simple_transaction_batch_v320"]) assert.ok(actions.includes(rpc), rpc);
});

test("taskbar has immutable CSS bottom 0; no VisualViewport scroll-derived bottom offset", () => {
  const nav = file("components/mobile-nav.tsx");
  assert.match(nav, /createPortal\(taskbar, document\.body\)/);
  assert.doesNotMatch(nav, /style\.setProperty\("--fin-mobile-nav-bottom"/);
  assert.doesNotMatch(nav, /visualViewport.*offsetTop/);
  assert.match(css, /\.fin-mobile-taskbar\s*\{[^}]*bottom:\s*0\s*!important;/s);
  assert.match(css, /\.fin-mobile-taskbar\s*\{[^}]*inset-block-end:\s*0\s*!important;/s);
  assert.doesNotMatch(css, /bottom:\s*var\(--fin-mobile-nav-bottom/);
  assert.match(css, /html:has\(\.fin-app-shell\), body:has\(\.fin-app-shell\)\s*\{[^}]*overflow:\s*hidden\s*!important;/s);
});

test("page has its own bounded scroller; route memory restores main scrollTop", () => {
  assert.match(css, /\.fin-app-shell\s*\{[^}]*height:\s*100dvh;/s);
  assert.match(css, /\.fin-main-region\s*\{[^}]*overflow-y:\s*auto;/s);
  assert.match(css, /\.fin-main-region\s*\{[^}]*overscroll-behavior-y:\s*none;/s);
  const memory = file("components/navigation-memory.tsx");
  assert.match(memory, /scrollRoot:\s*HTMLElement \| Window/);
  assert.match(memory, /window\.matchMedia\("\(max-width: 1023px\)"\)/);
  assert.match(memory, /scrollRoot\.scrollTo\(\{ top: saved/);
});

test("the sheet footer is an unscrollable sibling; overscrolling the body cannot push Save upward", () => {
  const sheet = file("components/bottom-sheet.tsx");
  assert.ok(sheet.indexOf('data-fin-sheet-scroll="true"') < sheet.indexOf('data-fin-sheet-action-slot="true"'));
  assert.match(css, /\.fin-sheet-action-slot:not\(:empty\)\s*\{[^}]*flex-shrink:\s*0\s*!important;/s);
  assert.match(css, /\.fin-sheet-scroll\s*\{\s*overscroll-behavior-y:\s*none\s*!important;/s);
  assert.match(sheet, /const keyboardVisible = keyboardShrink && \(focusInside \|\| keyboardWasVisible\);/);
  assert.match(sheet, /overlay\.style\.removeProperty\("top"\)/);
  assert.match(sheet, /overlay\.style\.removeProperty\("height"\)/);
});

test("focused transaction title stays inside sheet viewport as iPhone keyboard resizes", () => {
  const sheet = file("components/bottom-sheet.tsx");
  const focusHelper = file("components/transaction-form-visibility.ts");
  const entry = file("components/transaction-entry-form.tsx");
  assert.match(sheet, /overlay\.addEventListener\("focusin", onFocus\)/);
  assert.match(sheet, /viewport\?\.addEventListener\("resize", syncViewport\)/);
  assert.match(sheet, /revealTransactionFormTarget\(focused\)/);
  assert.match(sheet, /window\.setTimeout\(syncViewport, 300\)/);
  assert.match(focusHelper, /rootRect\.bottom - 28/);
  assert.match(entry, /name="title" className="fin-input" required/);
});
