import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root,path), "utf8");
const pkg = JSON.parse(read("package.json"));
const overview = read("app/(dashboard)/overview/page.tsx");
const reports = read("app/(dashboard)/reports/page.tsx");
const calendar = read("components/report-calendar-interactive.tsx");
const css = read("app/globals.css");

test("V3.5.0 release keeps six modules and finance actions", () => {
  assert.equal(pkg.version, "4.3.0");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "4\.3\.0"/);
  assert.deepEqual(readdirSync(join(root,"app/(dashboard)"),{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name).sort(),["accounts","categories","overview","reports","settings","transactions"]);
  const actions = read("features/transactions/actions.ts");
  for(const rpc of ["create_simple_transaction_v120","update_simple_transaction_v120","delete_simple_transaction_v120","copy_simple_transaction_batch_v320"]) assert.ok(actions.includes(rpc));
});

test("Overview has premium hero, recent activity, category breakdown and chart without changing ledger math", () => {
  for(const fragment of ["fin-dashboard-hero","fin-hero-balance","fin-hero-metrics","fin-overview-recent","fin-overview-chart","snapshot.monthTotals","loadDashboardSnapshot"]) assert.ok(overview.includes(fragment), fragment);
  assert.match(overview, /<CashflowChart daily=\{snapshot.daily\}/);
  assert.match(read("components/spending-period-card.tsx"), /Các khoản đã chi/);
  assert.match(read("features/dashboard/snapshot.ts"), /current_balance_minor/);
});

test("Six-month SVG chart is touch/key accessible, client-only and does not fetch", () => {
  const chart = read("components/cashflow-chart.tsx");
  assert.match(chart, /^"use client";/);
  for(const fragment of ["useState", "aria-pressed", "onClick", "aria-live", "TrendPlot", "formatMinorMoney", "Maximize2"]) assert.ok(chart.includes(fragment),fragment);
  assert.doesNotMatch(chart, /fetch\(|router\.push\(|createClient\(/);
});

test("Report KPI, period controls and flow toggles preserve instant client tab switching", () => {
  assert.match(read("components/fast-report-overview.tsx"), /FinanceMetricCard/);
  assert.match(reports, /loadPeriodSnapshot/);
  assert.match(read("features/reports/period-snapshot.ts"), /income: makeFlow\("income"\)/);
  assert.match(read("features/reports/period-snapshot.ts"), /expense: makeFlow\("expense"\)/);
  const breakdown = read("components/instant-report-breakdown.tsx");
  assert.match(breakdown, /history\.pushState/);
  assert.match(breakdown, /setType\(next\)/);
  const controls = read("components/report-period-controls.tsx");
  assert.match(controls, /fin-period-controls/);
  assert.match(controls, /finzaro:report-flow-change/);
  assert.match(read("components/finance-metric-card.tsx"), /fin-metric-card/);
});

test("Bar and donut charts offer selection, labels and reduced-motion-compatible transitions", () => {
  const bar = read("components/report-bar-chart.tsx");
  const donut = read("components/report-donut.tsx");
  assert.match(bar, /^"use client";/);
  for(const fragment of ["aria-pressed", "onClick", "aria-live", "fin-bar-fill"]) assert.ok(bar.includes(fragment));
  for(const fragment of ["onPieKey", "onClick", "fin-donut-center", "aria-pressed"]) assert.ok(donut.includes(fragment));
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /fin-chart-reveal, \.fin-bar-fill, \.fin-skeleton/);
});

test("Calendar separates today, selection and non-empty dates; retains swipe and native vertical scroll", () => {
  for(const fragment of ["todayDate", "is-today", "is-selected", "has-flow", "aria-pressed", "fin-calendar-swipe", "fin-calendar-day-list", "selectedTransactions"]) assert.ok(calendar.includes(fragment), fragment);
  assert.match(calendar, /touch-auto snap-x snap-mandatory/);
  assert.match(css, /\.fin-calendar-swipe \{ touch-action: pan-x pan-y/);
  assert.doesNotMatch(calendar, /router\.prefetch\("\/transactions\?new/);
});

test("Route skeletons exist for overview, reports, calendar and analysis", () => {
  for(const name of ["overview/loading.tsx", "reports/loading.tsx", "reports/calendar/loading.tsx"]) assert.match(read(`app/(dashboard)/${name}`), /ReportSkeleton/);
  assert.match(read("app/(dashboard)/reports/analysis/page.tsx"), /redirect/);
  const skeleton = read("components/report-skeleton.tsx");
  assert.match(skeleton, /aria-busy="true"/);
  assert.match(css, /\.fin-skeleton \{/);
});

test("Premium light/dark chart surfaces and safe mobile content spacing are defined", () => {
  for(const selector of ["--fin-report-income", "--fin-report-expense", "--fin-report-net", "--fin-chart-panel", ".fin-dashboard-hero", ".fin-report-navigation", ".fin-calendar-day.is-selected", "env(safe-area-inset-bottom)"]) assert.ok(css.includes(selector), selector);
  assert.match(css, /\.dark \{[\s\S]*?--fin-chart-highlight:/);
  assert.match(css, /@media \(prefers-contrast: more\)/);
});
