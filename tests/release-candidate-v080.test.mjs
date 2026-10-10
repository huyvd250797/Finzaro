import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V0.8.0 migration matches SQL Editor script and expands category icons", async () => {
  const migration = await read("supabase/migrations/20261010223000_release_candidate_v080.sql");
  const sqlEditor = await read("supabase/sql-editor/V0.8.0_release_candidate.sql");
  assert.equal(migration, sqlEditor);
  assert.match(migration, /categories_icon_allowed_v080/);
  assert.match(migration, /'Apple'/);
  assert.match(migration, /'HandCoins'/);
  assert.match(migration, /'Pill'/);
  assert.match(migration, /'Sparkles'/);
  assert.match(migration, /'Zap'/);
});

test("Reports RC exposes overview, calendar, analysis and category drill-down", async () => {
  const overview = await read("app/(dashboard)/reports/page.tsx");
  const calendar = await read("app/(dashboard)/reports/calendar/page.tsx");
  const analysis = await read("app/(dashboard)/reports/analysis/page.tsx");
  const category = await read("app/(dashboard)/reports/category/[categoryId]/page.tsx");
  assert.match(overview, /ReportNavigation active="overview"/);
  assert.match(overview, /Hàng tháng/);
  assert.match(overview, /Hàng năm/);
  assert.match(calendar, /ReportNavigation active="calendar"/);
  assert.match(calendar, /values\.income > 0/);
  assert.match(calendar, /values\.expense > 0/);
  assert.match(calendar, /text-emerald-500/);
  assert.match(calendar, /text-rose-500/);
  assert.doesNotMatch(calendar, />\+0đ</);
  assert.match(analysis, /ReportNavigation active="analysis"/);
  assert.match(category, /ReportBarChart/);
  assert.match(category, /Theo tháng/);
});

test("category picker provides expanded searchable icon set", async () => {
  const icons = await read("features/categories/icons.tsx");
  const picker = await read("components/category-icon-picker.tsx");
  assert.match(icons, /CATEGORY_ICON_LABELS/);
  assert.match(icons, /AlarmClock/);
  assert.match(icons, /Ambulance/);
  assert.match(icons, /HandHeart/);
  assert.match(icons, /MapPin/);
  assert.match(picker, /type="search"/);
  assert.match(picker, /CATEGORY_ICON_NAMES\.length/);
});

test("mobile navigation promotes Reports and keeps Recurring in module sheet", async () => {
  const nav = await read("components/mobile-nav.tsx");
  assert.match(nav, /href: "\/reports", label: "Báo cáo"/);
  assert.match(nav, /href: "\/recurring", label: "Định kỳ"/);
  assert.match(nav, /pathname\.startsWith/);
});

test("V0.8.0 remains recorded as the Release Candidate baseline", async () => {
  const doc = await read("docs/V0.8.0_RELEASE_CANDIDATE.md");
  const changelog = await read("CHANGELOG.md");
  assert.match(doc, /V0\.8\.0/);
  assert.match(doc, /Release Candidate/);
  assert.match(changelog, /V0\.8\.0/);
});
