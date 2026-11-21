import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
const read = (p) => readFileSync(join(import.meta.dirname, "..", p), "utf8");

test("V4.6.12 fullscreen Fund and Debt modals follow visible viewport, not hardcoded 100dvh", () => {
  for (const file of ["components/family-savings-panel.tsx", "components/personal-debt-panel.tsx"]) {
    const src = read(file);
    assert.match(src, /fin-fullscreen-sheet/);
    assert.doesNotMatch(src, /!h-\[100dvh\]|!max-h-\[100dvh\]/);
  }
  const css = read("app/globals.css");
  assert.match(css, /\.fin-sheet-panel\.fin-fullscreen-sheet/);
  assert.match(css, /height: 100%;\s*max-height: 100%/);
  const shared = read("components/bottom-sheet.tsx");
  assert.match(shared, /visualViewport/);
  assert.match(shared, /overlay\.style\.height/);
  assert.match(shared, /setTimeout\(syncViewport, 380\)/);
});

test("V4.6.12 global keyboard visibility works on inputs, textarea, selects and comboboxes", () => {
  const shared = read("components/transaction-form-visibility.ts");
  const manager = read("components/keyboard-focus-manager.tsx");
  const layout = read("app/layout.tsx");
  assert.match(shared, /data-fin-sheet-scroll/);
  assert.match(shared, /fin-main-region/);
  assert.match(shared, /keyboardOpen/);
  assert.match(manager, /document\.addEventListener\("focusin"/);
  assert.match(manager, /\[role="combobox"\]/);
  assert.match(manager, /target\.closest\("\.fin-sheet-backdrop"\)/);
  assert.match(layout, /<KeyboardFocusManager/);
});

test("V4.6.12 fund removal requires explicit confirmation and signed-in owner", () => {
  const ui = read("components/family-savings-panel.tsx");
  const action = read("features/accounts/family-fund-actions.ts");
  const sql = read("supabase/migrations/20261121220000_family_fund_delete_v4612.sql");
  assert.match(ui, /Xóa quỹ/);
  assert.match(ui, /confirmDelete/);
  assert.match(ui, /name="confirmed" value="yes" required/);
  assert.match(action, /field\(form,"confirmed"\) !== "yes"/);
  assert.match(action, /rpc\("family_fund_delete_v4612"/);
  for (const part of ["auth.uid()", "SECURITY DEFINER", "account_type = 'family_savings'", "FOR UPDATE", "transaction_entries", "v_balance <> 0", "is_archived = true", "DELETE FROM public.accounts", "GRANT EXECUTE"]) assert.ok(sql.includes(part), part);
  assert.doesNotMatch(sql, /DELETE FROM public.transactions/);
});

test("V4.6.12 focus helper scrolls a covered field inside the modal, not the body", () => {
  const ts = createRequire(import.meta.url)("typescript");
  const source = read("components/transaction-form-visibility.ts");
  const js = ts.transpileModule(source, {
    fileName: "transaction-form-visibility.ts",
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", js)(module, module.exports);
  const { revealTransactionFormTarget } = module.exports;
  const moved = [];
  const root = {
    getBoundingClientRect: () => ({ top: 0, bottom: 420 }),
    querySelector: (selector) => selector === ".sticky.bottom-0" ? {} : null,
    scrollBy: (arg) => moved.push(arg)
  };
  const target = {
    isConnected: true,
    closest: (selector) => selector === "[data-fin-sheet-scroll]" ? root : null,
    getBoundingClientRect: () => ({ top: 360, bottom: 405, height: 45 })
  };
  const oldWindow = globalThis.window;
  globalThis.window = { innerHeight: 850, visualViewport: { height: 420, offsetTop: 0 } };
  try {
    revealTransactionFormTarget(target);
    assert.equal(moved.length, 1);
    assert.ok(moved[0].top > 0, "covered field should scroll up into the visible region");
  } finally {
    globalThis.window = oldWindow;
  }
});


test("V4.6.12 focus helper also scrolls a normal page field above the phone keyboard", () => {
  const ts = createRequire(import.meta.url)("typescript");
  const output = ts.transpileModule(read("components/transaction-form-visibility.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", output)(mod, mod.exports);
  let movement = null;
  const page = {
    getBoundingClientRect: () => ({ top: 0, bottom: 900 }),
    scrollBy: ({ top }) => { movement = top; }
  };
  const field = {
    isConnected: true,
    closest: (selector) => selector === ".fin-main-region" ? page : null,
    getBoundingClientRect: () => ({ top: 635, bottom: 685, height: 50 })
  };
  const savedWindow = globalThis.window;
  globalThis.window = { innerHeight: 900, visualViewport: { height: 530, offsetTop: 0 } };
  try {
    mod.exports.revealTransactionFormTarget(field);
    assert.ok(movement > 100);
  } finally {
    globalThis.window = savedWindow;
  }
});
