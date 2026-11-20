import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const grid = read("components/category-manager-grid.tsx");
const quick = read("features/transactions/quick-entry.ts");
const test452 = read("tests/v452-category-management-ux.test.mjs");

// The React Compiler rejects mutation of objects derived from useRef.
// Imperative DOM methods are valid in pointer event handlers.
test("V4.5.4 auto-scroll uses DOM scrollBy, without mutating a React-owned ref-derived value", () => {
  assert.match(grid, /function scrollNearEdge\(clientY: number\)/);
  assert.match(grid, /if \(scroller\) scroller\.scrollBy\(0, delta\)/);
  assert.doesNotMatch(grid, /scroller\.scrollTop\s*(?:\+\+|--|\+=|-=|=)/);
  assert.match(grid, /else window\.scrollBy\(0, delta\)/);
  assert.match(grid, /scrollNearEdge\(event\.clientY\)/);
});

test("Long-press iOS sorting retains scroll-port discovery and window fallback", () => {
  assert.match(grid, /const overflow = window\.getComputedStyle\(scroller\)\.overflowY/);
  assert.match(grid, /scroller\.scrollHeight > scroller\.clientHeight \+ 8/);
  assert.match(grid, /const delta = clientY < top \+ edge \? -18 : clientY > bottom - edge \? 18 : 0/);
  assert.match(grid, /setPointerCapture\(pointerId\)/);
  assert.match(grid, /reorderCategoriesAction\(type, orderedIds\)/);
});

test("Quick-entry type parameter is used for runtime validation, not left unused", () => {
  assert.match(quick, /parseQuickEntryState\(value: unknown, type: TransactionType\)/);
  assert.match(quick, /if \(!TYPES\.includes\(type\)\) return empty;/);
  assert.match(quick, /parseQuickEntryState\(raw, type\)/);
  assert.match(quick, /parseQuickEntryState\(state, type\)/);
});

test("Category test no longer imports unused createRequire; release gate stays strict", () => {
  assert.doesNotMatch(test452, /import \{ createRequire \} from/);
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.version, "4.6.6");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "4\.6\.6"/);
  assert.equal(pkg.scripts.check, "npm run lint && npm run typecheck && npm run test && npm run build");
  assert.deepEqual(readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(),
    ["accounts", "categories", "overview", "portfolio", "reports", "settings", "transactions"]);
});
