import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V0.7.5 migration matches SQL Editor script and adds history-query indexes", async () => {
  const migration = await read("supabase/migrations/20261010123000_release_stabilization_v075.sql");
  const sqlEditor = await read("supabase/sql-editor/V0.7.5_release_stabilization.sql");
  assert.equal(migration, sqlEditor);
  assert.match(migration, /loan_payments_user_date_idx/);
  assert.match(migration, /credit_card_payments_user_date_idx/);
  assert.match(migration, /asset_valuations_user_date_idx/);
  assert.match(migration, /create index if not exists/g);
});

test("money calculator replaces a pending operator instead of double-applying the same operand", async () => {
  const source = await read("components/money-calculator-input.tsx");
  assert.match(source, /accumulator !== null && operator && !entry/);
  assert.match(source, /setOperator\(nextOperator\)/);
  assert.match(source, /return;\n\s*}\n\n\s*const current = canonicalToNumber/);
});

test("overlay scroll lock is reference-counted and never fixes body position", async () => {
  const source = await read("components/use-overlay-scroll-lock.ts");
  assert.match(source, /let lockDepth = 0/);
  assert.match(source, /lockDepth \+= 1/);
  assert.match(source, /lockDepth = Math\.max\(0, lockDepth - 1\)/);
  assert.doesNotMatch(source, /position\s*=\s*["']fixed["']/);
});

test("PWA install keeps recovery pages mandatory and optional assets non-blocking", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /const REQUIRED_SHELL = \["\/offline", "\/pwa-error"\]/);
  assert.match(sw, /Promise\.allSettled\(OPTIONAL_SHELL/);
  assert.match(sw, /key\.startsWith\("finzaro-static-v"\)/);
  assert.doesNotMatch(sw, /keys\.filter\(\(key\) => key !== CACHE_NAME\)/);
});

test("V0.7.5 remains recorded as the stabilization baseline", async () => {
  const changelog = await read("CHANGELOG.md");
  assert.match(changelog, /V0\.7\.5 — Release Stabilization/);
  const docs = await read("docs/V0.7.5_RELEASE_STABILIZATION.md");
  assert.match(docs, /Release Stabilization/);
});
