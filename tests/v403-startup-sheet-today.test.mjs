import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("PWA cold launch renders branded HTML before authentication or redirects", () => {
  const launch = file("app/pwa/route.ts");
  const proxy = file("proxy.ts");
  assert.match(launch, /force-static/);
  assert.match(launch, /<!doctype html>/i);
  assert.match(launch, /Finzaro/);
  assert.match(launch, /class="loader"/);
  assert.match(launch, /location\.replace\('\/overview'\)/);
  assert.doesNotMatch(launch, /getClaims|createClient|NextResponse\.redirect/);
  assert.match(proxy, /pathname === "\/pwa"/);
  assert.match(file("app/manifest.ts"), /start_url: "\/pwa\?source=homescreen"/);
  assert.match(file("app/layout.tsx"), /Critical first-paint splash styles/);
  const sw = file("public/sw.js");
  assert.match(sw, /url\.pathname === "\/pwa"/);
  assert.match(sw, /caches\.match\("\/pwa\?source=homescreen"\)/);
  assert.match(sw, /fetch\(event\.request, \{ cache: "no-store" \}\)/);
  assert.doesNotMatch(sw, /caches\.match\("\/overview"\)/);
});

test("sheet grip does not receive automatic focus and still supports drag and Escape", () => {
  const sheet = file("components/bottom-sheet.tsx");
  assert.match(sheet, /panel\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(sheet, /tabIndex=\{-1\} aria-label="Kéo xuống để đóng"/);
  assert.match(sheet, /onPointerDown=\{onDragStart\}/);
  assert.match(sheet, /event\.key === "Escape"/);
  assert.match(file("app/globals.css"), /\.fin-sheet-panel:focus, \.fin-sheet-handle:focus/);
});

test("daily spend uses locale timezone, same ledger, valid expense roles and existing currency", () => {
  const overview = file("app/(dashboard)/overview/page.tsx");
  const data = file("features/transactions/data.ts");
  assert.match(data, /export function currentDateKey\(timeZone: string/);
  assert.match(data, /Intl\.DateTimeFormat\("en-US", \{ timeZone, year: "numeric", month: "2-digit", day: "2-digit" \}\)/);
  assert.match(overview, /today = currentDateKey\(timeZone\)/);
  assert.match(overview, /tx\.transaction_date !== today/);
  assert.match(overview, /tx\.transaction_type !== "expense"/);
  assert.match(overview, /tx\.transaction_purpose !== "standard"/);
  assert.match(overview, /entry\?\.currency_code === currency/);
  assert.match(overview, /todayExpenses\.reduce/);
  assert.match(overview, /Chi tiêu hôm nay/);
  assert.match(overview, /Các khoản đã chi/);
  assert.match(overview, /type=expense&from=\$\{today\}&to=\$\{today\}/);
});
