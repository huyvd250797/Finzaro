import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V1.1.7 pie uses Category colors and keeps a full center-free chart", async () => {
  const page = await read("app/(dashboard)/reports/page.tsx");
  const donut = await read("components/report-donut.tsx");
  assert.match(page, /color: iconColorValue\(item\.icon_color\)/);
  assert.match(page, /backgroundColor: color/);
  assert.match(donut, /conic-gradient/);
  assert.match(donut, /slice\.color/);
  assert.doesNotMatch(donut, /reportSliceColor/);
  assert.doesNotMatch(donut, /rounded-full[^\n]*absolute[^\n]*bg-\[var\(--card\)\]/);
});

test("V1.1.7 Overview reduces vertical control layers and keeps all KPIs on one row", async () => {
  const page = await read("app/(dashboard)/reports/page.tsx");
  assert.match(page, /grid-cols-\[112px_1fr\]/);
  assert.match(page, /grid grid-cols-3 gap-2/);
  assert.match(page, />Tháng<\/Link>/);
  assert.match(page, />Năm<\/Link>/);
  assert.doesNotMatch(page, />Hàng tháng<\/Link>/);
});

test("V1.1.7 Calendar fits seven columns on mobile and shows two exact flow lines without currency suffix", async () => {
  const calendar = await read("app/(dashboard)/reports/calendar/page.tsx");
  assert.doesNotMatch(calendar, /min-w-\[700px\]/);
  assert.doesNotMatch(calendar, /overflow-x-auto/);
  assert.match(calendar, /grid grid-cols-7/);
  assert.match(calendar, /calendarMoney\(values\.income, "\+", digits\)/);
  assert.match(calendar, /calendarMoney\(values\.expense, "-", digits\)/);
  assert.match(calendar, /grid grid-cols-3 gap-2/);
  assert.match(calendar, /Không hiện 0đ/);
});

test("V1.1.7 release metadata is current", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const version = await read("lib/app-version.ts");
  assert.equal(pkg.version, "1.1.7");
  assert.match(version, /APP_VERSION = "1\.1\.7"/);
  assert.match(version, /Reports UI & Calendar Polish/);
});
