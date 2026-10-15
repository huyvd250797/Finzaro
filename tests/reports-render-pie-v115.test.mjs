import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V1.1.9 pie no longer uses generated SVG arc paths", async () => {
  const source = await read("components/report-donut.tsx");
  assert.match(source, /conic-gradient/);
  assert.match(source, /selectFromPoint/);
  assert.doesNotMatch(source, /<svg/);
  assert.doesNotMatch(source, /slicePath\(/);
});

test("V1.1.9 contains visualization errors inside Reports", async () => {
  const page = await read("app/(dashboard)/reports/page.tsx");
  const boundary = await read("components/report-visual-boundary.tsx");
  assert.match(page, /ReportVisualBoundary/);
  assert.match(boundary, /getDerivedStateFromError/);
  assert.match(boundary, /visualization recovered/);
});

test("V1.1.9 hardens report formatting and legacy transaction entries", async () => {
  const utils = await read("lib/utils.ts");
  const experience = await read("features/reports/experience.ts");
  const transactions = await read("features/transactions/data.ts");
  assert.match(utils, /try \{/);
  assert.match(utils, /safeCurrency/);
  assert.match(experience, /fallbackValue/);
  assert.match(experience, /Array\.isArray\(transaction\.entries\)/);
  assert.match(transactions, /!Array\.isArray\(transaction\.entries\)/);
});

test("V1.1.9 release metadata is current", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const version = await read("lib/app-version.ts");
  assert.equal(pkg.version, "1.1.9");
  assert.match(version, /APP_VERSION = "1\.1\.9"/);
  assert.match(version, /Category Grid & Save Performance Fix/);
});
