import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const page = read("app/(dashboard)/categories/page.tsx");
const grid = read("components/category-manager-grid.tsx");
const action = read("features/categories/actions.ts");
const css = read("app/globals.css");
const pkg = JSON.parse(read("package.json"));

test("V4.5.3 version is consistent; strict release gate and six modules preserved", () => {
  assert.equal(pkg.version, "4.5.3");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "4\.5\.3"/);
  assert.equal(pkg.scripts.check, "npm run lint && npm run typecheck && npm run test && npm run build");
  assert.deepEqual(readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(),
    ["accounts", "categories", "overview", "reports", "settings", "transactions"]);
});

test("Expense and Income use a compact exclusive tab selector without long vertical lists", () => {
  assert.match(grid, /role="tablist"/);
  assert.match(grid, /aria-selected=\{type === "expense"\}/);
  assert.match(grid, /aria-selected=\{type === "income"\}/);
  assert.match(grid, /item\.category_type === type && item\.is_archived === archived/);
  assert.match(page, /<CategoryManagerGrid/);
  assert.doesNotMatch(page, /<CategorySection|<CategoryForm/);
});

test("Category tile is one tap-to-edit button with no inline edit/archive/reorder action buttons", () => {
  assert.match(grid, /<button key=\{category\.id\} type="button" data-category-manager-id/);
  assert.match(grid, /onClick=\{\(\) => onCardClick\(category\)\}/);
  assert.match(grid, /<BottomSheet open=\{editor !== null\}/);
  assert.match(grid, /<SheetFormActions/);
  assert.match(grid, /type="submit" form=\{formId\}/);
  assert.doesNotMatch(grid, /fin-category-action|<Pencil|<ArrowLeft|<ArrowRight/);
  assert.match(grid, /<CategoryIconPicker/);
});

test("Modal persists edits and archives only after authenticated successful server response", () => {
  assert.match(grid, /await saveCategoryInlineAction\(input\)/);
  assert.match(grid, /if \(!result\.ok\) \{ setFormError\(result\.error\); return; \}/);
  assert.match(grid, /replaceItem\(result\.category\)/);
  assert.match(grid, /setEditor\(null\)/);
  assert.match(grid, /await archiveCategoryInlineAction\(editor\.id, nextArchived\)/);
  assert.match(grid, /window\.confirm/);
  assert.match(action, /\.eq\("id", input\.id\)\.eq\("user_id", userId\)/);
  assert.match(action, /\.eq\("id", id\)\.eq\("user_id", userId\)/);
});

test("Category parent validation rejects invalid, cross-type or cyclic parent records", () => {
  assert.match(action, /parentId === input\.id/);
  assert.match(action, /parent\.category_type !== input\.category_type/);
  assert.match(action, /parent\.parent_id === input\.id/);
  assert.match(action, /\.eq\("user_id", userId\)\.maybeSingle\(\)/);
});

test("Long-press enters wiggle mode, pointer-capture reorder animates neighboring cards", () => {
  assert.match(grid, /420\)/);
  assert.match(grid, /setPointerCapture\(pointerId\)/);
  assert.match(grid, /elementFromPoint\(event\.clientX, event\.clientY\)/);
  assert.match(grid, /scrollNearEdge\(event\.clientY\)/);
  assert.match(grid, /element\.animate\(/);
  assert.match(css, /@keyframes fin-category-wiggle/);
  assert.match(css, /fin-category-sort-mode/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("Drop persists authenticated complete order, then rolls back on server error", () => {
  assert.match(grid, /reorderCategoriesAction\(type, orderedIds\)/);
  assert.match(grid, /itemsRef\.current = before/);
  assert.match(grid, /setItems\(before\)/);
  assert.match(grid, /onPointerCancel=\{onPointerCancel\}/);
  assert.match(grid, /data-sort-done/);
  assert.match(grid, /document\.addEventListener\("pointerdown", onOutside\)/);
  assert.match(action, /Promise\.allSettled/);
});

test("Desktop keyboard can reorder without exposing four actions per tile", () => {
  assert.match(grid, /event\.altKey/);
  assert.match(grid, /event\.key !== "ArrowLeft"/);
  assert.match(grid, /onKeyDown=\{\(event\) => \{ void onCardKeyDown/);
  assert.match(grid, /aria-label/);
});

test("Unnecessary instructional descriptions are removed; safety-critical financial disclosures stay", () => {
  for (const file of ["app/(dashboard)/categories/page.tsx", "app/(dashboard)/transactions/page.tsx",
    "app/(dashboard)/accounts/page.tsx", "app/(dashboard)/overview/page.tsx",
    "app/(dashboard)/reports/page.tsx", "app/(dashboard)/settings/page.tsx"]) {
    assert.doesNotMatch(read(file), /Tìm, sắp xếp và tùy chỉnh danh mục|Theo dõi số dư, thu chi và hoạt động gần nhất|thao tác nhanh, số dư tự cập nhật|Xem số dư từng ví, tìm kiếm tài khoản/);
  }
  assert.match(read("app/(dashboard)/reports/statements/page.tsx"), /ngoại tệ không được quy đổi tự động/);
  assert.match(read("app/(dashboard)/accounts/page.tsx"), /Không cộng gộp các loại tiền khác nhau/);
  assert.doesNotMatch(grid, /Giữ và kéo để sắp xếp · hoặc dùng mũi tên/);
});

test("No V4.5.3 SQL migration; transaction accounting and past period comparison unchanged", () => {
  assert.equal(readdirSync(join(root, "supabase/migrations")).some((filename) => /v452/i.test(filename)), false);
  assert.match(read("features/transactions/actions.ts"), /create_simple_transaction_v120/);
  assert.match(read("features/dashboard/period-comparison.ts"), /comparePeriodTotals/);
});
