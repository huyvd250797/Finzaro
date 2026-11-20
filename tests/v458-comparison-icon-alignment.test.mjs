import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); }
catch { ts = require(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript")); }

test("V4.6.0 changes only comparison icon alignment, with V4.6.0 additive migration", () => {
  assert.equal(JSON.parse(read("package.json")).version, "4.6.4");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "4\.6\.4"/);
  assert.match(read("lib/app-version.ts"), /Comparison Icon Alignment Fix|Multi-Asset Portfolio|Asset Management UX & Edit|Market Price Reliability Fix|Market Price Reliability Deploy Fix|Portfolio UX & Snapshot Fix/);
  assert.equal(readdirSync(join(root, "supabase/migrations")).filter(name => name.endsWith(".sql")).length, 34);
  assert.match(read("features/dashboard/snapshot.ts"), /dashboard_period_comparison_v457/);
});

test("Trend icon is adjacent to its direction word as a non-breaking inline unit", () => {
  const card = read("components/spending-period-card.tsx");
  assert.match(card, /className="inline-flex items-center gap-\[2px\] whitespace-nowrap align-middle"/);
  assert.match(card, /<ChangeIcon className="size-\[1em\] shrink-0"[^>]*\/>\s*<span>\{changePrefix\}<\/span>/);
  assert.match(card, /text-right text-\[clamp/);
  assert.match(card, /<span className="whitespace-nowrap">\{money\(Math\.abs\(change\.difference\)\)\}<\/span>/);
  assert.doesNotMatch(card, /<p className=\{`mt-0\.5 inline-flex max-w-full items-start justify-end/);
  assert.doesNotMatch(card, /<ChangeIcon className="mt-0\.5 size-4 shrink-0"/);
  assert.match(card, /const ChangeIcon = change\.difference > 0 \? TrendingUp : change\.difference < 0 \? TrendingDown : Minus/);
});

test("Updated comparison card remains valid TypeScript TSX syntax", () => {
  const path = "components/spending-period-card.tsx";
  const result = ts.transpileModule(read(path), { fileName: path, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve } });
  const errors = (result.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors, []);
  assert.match(result.outputText, /changePrefix/);
});
