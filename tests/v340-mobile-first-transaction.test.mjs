import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const read = (name) => readFileSync(join(root,name),"utf8");
const pkg = JSON.parse(read("package.json"));
const css = read("app/globals.css");
const sheet = read("components/bottom-sheet.tsx");
const form = read("components/transaction-entry-form.tsx");
const tabs = read("components/instant-transaction-launcher.tsx");

test("V3.4.0 release keeps six modules and transaction services intact",()=>{
  assert.ok(Number(pkg.version.split(".")[0]) > 3 || (Number(pkg.version.split(".")[0]) === 3 && Number(pkg.version.split(".")[1]) >= 4));
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "(?:3\.[4-9]\.0|4\.[0-9]\.[0-9]+)"/);
  assert.deepEqual(readdirSync(join(root,"app/(dashboard)"),{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort(),["accounts","categories","overview","reports","settings","transactions"]);
  for (const rpc of ["create_simple_transaction_v120","copy_simple_transaction_batch_v320"]) assert.ok(read("features/transactions/actions.ts").includes(rpc));
});

test("BottomSheet is portaled above mobile navigation with its own scrollable body",()=>{
  assert.match(sheet, /createPortal\(/);
  assert.match(sheet, /document\.body/);
  assert.match(sheet, /fin-sheet-scroll[^\n]*overflow-y-auto/);
  assert.match(sheet, /min-h-0 max-h-\[94dvh\] flex-col overflow-hidden/);
  assert.match(sheet, /data-fin-sheet-scroll="true"/);
  assert.match(css, /\.fin-sheet-backdrop\s*\{[^}]*bottom: auto/s);
  assert.match(css, /\.fin-sheet-scroll\s*\{[^}]*overflow-y: auto/s);
});

test("iOS visual viewport shrink does not bury form save actions under software keyboard",()=>{
  assert.match(sheet, /window\.visualViewport/);
  assert.match(sheet, /viewport\?\.addEventListener\("resize", syncViewport\)/);
  assert.match(sheet, /--fin-visual-height/);
  assert.match(css, /\.fin-transaction-sheet\s*\{\s*height: calc\(var\(--fin-visual-height/s);
  assert.match(sheet, /data-fin-sheet-action-slot="true"/);
  assert.match(form, /createPortal\(saveActions, footerSlot\.element\)/);
  assert.match(css, /\.fin-sheet-action-slot:not\(:empty\)/);
  assert.match(css, /min-height: 48px/);
  assert.match(form, /fin-transaction-savebar/);
  assert.match(form, /Lưu giao dịch/);
});

test("Mobile category picker remains constrained and transaction drafts survive type changes",()=>{
  assert.match(css, /\.fin-transaction-sheet \.fin-category-scroll\s*\{[^}]*max-height: min\(336px, 32dvh\)/s);
  assert.match(css, /overscroll-behavior-y: auto/);
  assert.match(tabs, /visited\.map\(\(kind\)/);
  assert.match(tabs, /hidden=\{type !== kind\}/);
  assert.match(tabs, /\[type\]/);
  assert.match(tabs, /scrollTo\(\{ top: 0/);
});
