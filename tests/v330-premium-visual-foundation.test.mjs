import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const css = read("app/globals.css");
const pkg = JSON.parse(read("package.json"));

function luminance(hex) {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const linear = channels.map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrast(fg, bg) {
  const [low, high] = [luminance(fg), luminance(bg)].sort((a, b) => a - b);
  return (high + 0.05) / (low + 0.05);
}

test("V3.3.0 design system persists through later versions, unchanged module scope and finance RPCs", () => {
  assert.ok((Number(pkg.version.split(".")[0]) > 3 || Number(pkg.version.split(".")[1]) >= 3), "UI foundation preserved in V3.3+");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "4\.0\.3"/);
  assert.match(read("lib/app-version.ts"), /Foundation|Mobile-First Transaction UX|Premium Overview & Reports|Fluid Motion & Navigation|Premium UX Release|Fixed Mobile Chrome & Sheet Actions|Viewport-Locked Mobile Chrome & Keyboard Focus|Instant Launch Splash, Clean Sheet Grip & Today Spending/);
  assert.deepEqual(readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(), ["accounts", "categories", "overview", "reports", "settings", "transactions"]);
  const actions = read("features/transactions/actions.ts");
  for (const rpc of ["create_simple_transaction_v120", "update_simple_transaction_v120", "delete_simple_transaction_v120", "copy_simple_transaction_batch_v320"]) assert.ok(actions.includes(rpc), rpc);
});

test("Semantic light/dark tokens, panels, controls and modal shell are defined", () => {
  for (const token of ["--fin-canvas", "--fin-surface", "--fin-surface-elevated", "--fin-text-secondary", "--fin-accent-wash", "--fin-edge", "--fin-shadow-overlay", "--radius-card", "--radius-control"]) assert.ok(css.includes(token), token);
  for (const selector of [".fin-hero-card", ".fin-report-kpi", ".fin-app-sidebar", ".fin-app-header", ".fin-premium-tabbar", ".fin-premium-dialog", ".fin-auth-panel", ".fin-field", ".fin-button-danger"]) assert.ok(css.includes(selector), selector);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(prefers-contrast: more\)/);
  assert.match(css, /@media print/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /font-size: 16px !important/);
});

test("Premium palette meets WCAG AA normal text contrast for its core combinations", () => {
  for (const [fg,bg] of [
    ["#142720", "#f3f7f5"], ["#60756c", "#ffffff"], ["#ebf6ef", "#0b1412"],
    ["#a3b8ab", "#121f1a"], ["#ffffff", "#087e5c"], ["#08271b", "#43d6a2"]
  ]) assert.ok(contrast(fg,bg) >= 4.5, `${fg} on ${bg} contrast ${contrast(fg,bg)}`);
});

test("Shared primitives and concrete screens use the design system", () => {
  const button = read("components/ui/button.tsx");
  assert.match(button, /type ButtonVariant = "primary" \| "secondary" \| "ghost" \| "danger"/);
  assert.match(button, /className=\{cn\(/);
  const input = read("components/ui/input.tsx");
  for (const component of ["Input", "Select", "Textarea"]) assert.ok(input.includes(`function ${component}(`));
  const settings = read("app/(dashboard)/settings/page.tsx");
  assert.match(settings, /<Input name="display_name"/);
  assert.match(settings, /<Select name="currency_code"/);
  assert.match(settings, /<Button type="submit"/);
  const overview = read("app/(dashboard)/overview/page.tsx");
  assert.match(overview, /fin-hero-card/);
  assert.match(overview, /fin-overview-chart/);
  assert.match(read("app/(dashboard)/reports/page.tsx"), /fin-report-kpi/);
});

test("Accessibility and modal focus management survive visual redesign", () => {
  const layout = read("app/(dashboard)/layout.tsx");
  assert.match(layout, /href="#fin-main-content"/);
  assert.match(layout, /id="fin-main-content" tabIndex=\{-1\}/);
  const sheet = read("components/bottom-sheet.tsx");
  assert.match(sheet, /role="dialog" aria-modal="true" aria-label=\{label\}/);
  assert.match(sheet, /event\.key === "Escape"/);
  assert.match(sheet, /event\.key !== "Tab"/);
  assert.match(sheet, /fin-premium-dialog/);
  assert.match(read("components/theme-toggle.tsx"), /fin-theme-toggle/);
  assert.match(read("components/mobile-nav.tsx"), /fin-premium-tabbar/);
});
