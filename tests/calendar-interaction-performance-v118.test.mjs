import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V1.1.8 Calendar day selection is client-side and does not navigate for every tap", async () => {
  const interactive = await read("components/report-calendar-interactive.tsx");
  assert.match(interactive, /useState\(initialSelectedDay\)/);
  assert.match(interactive, /window\.history\.replaceState/);
  assert.match(interactive, /transactions\.filter\(\(item\) => item\.date === selectedDay\)/);
  assert.doesNotMatch(interactive, /href=\{`\/reports\/calendar\?period=.*&day=/);
});

test("V1.1.8 Calendar uses larger cells and whole-unit amount labels", async () => {
  const interactive = await read("components/report-calendar-interactive.tsx");
  assert.match(interactive, /min-h-\[98px\]/);
  assert.match(interactive, /maximumFractionDigits: 0/);
  assert.match(interactive, /Math\.round\(value \/ scale\)/);
  assert.match(interactive, /text-emerald-500/);
  assert.match(interactive, /text-rose-500/);
});

test("V1.1.8 supports double tap quick entry for the selected date", async () => {
  const interactive = await read("components/report-calendar-interactive.tsx");
  assert.match(interactive, /now - previous\.at <= 360/);
  assert.match(interactive, /Chi tiền/);
  assert.match(interactive, /Thu tiền/);
  assert.match(interactive, /Chuyển/);
  assert.match(interactive, /new: type, date, return_to/);
});

test("V1.1.8 selected-day transactions expose swipe Edit Delete actions", async () => {
  const interactive = await read("components/report-calendar-interactive.tsx");
  assert.match(interactive, /overflow-x-auto/);
  assert.match(interactive, /snap-x snap-mandatory/);
  assert.match(interactive, /Sửa/);
  assert.match(interactive, /deleteTransactionAction/);
  assert.match(interactive, /name="return_to"/);
});

test("V1.1.8 create edit delete can return to the exact calendar day", async () => {
  const actions = await read("features/transactions/actions.ts");
  const page = await read("app/(dashboard)/transactions/page.tsx");
  const form = await read("components/transaction-entry-form.tsx");
  assert.match(actions, /safeReturnTo/);
  assert.match(actions, /feedbackDestination/);
  assert.match(actions, /\/reports\/calendar/);
  assert.match(page, /return_to\?: string/);
  assert.match(page, /requestedDate/);
  assert.match(form, /name="return_to"/);
  assert.match(form, /defaultValue=\{today\}/);
});

test("V1.1.8 Calendar uses the canonical fast month-ledger path with hardened fallback", async () => {
  const page = await read("app/(dashboard)/reports/calendar/page.tsx");
  assert.match(page, /loadLedger\(supabase, userId, \{ fromDate: bounds\.from, toDate: bounds\.to, fetchAll: true \}\)/);
  assert.match(page, /catch\(\(\) => loadReportLedger/);
});

test("V1.1.8 release metadata is current", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const version = await read("lib/app-version.ts");
  assert.equal(pkg.version, "1.1.8");
  assert.match(version, /APP_VERSION = "1\.1\.8"/);
  assert.match(version, /Calendar Interaction & Performance Fix/);
});
