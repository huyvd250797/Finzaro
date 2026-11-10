import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V1.1.9 uses a visual 3-4 column category grid with configured icon colors", async () => {
  const source = await read("components/transaction-category-select.tsx");
  assert.match(source, /grid-cols-3/);
  assert.match(source, /sm:grid-cols-4/);
  assert.match(source, /CategoryIcon/);
  assert.match(source, /iconColorValue\(category\.icon_color\)/);
  assert.match(source, /name="category_id"/);
  assert.doesNotMatch(source, /<select[\s\S]*name="category_id"/);
});

test("V1.1.9 supports hold-drag category ordering and persists sort_order", async () => {
  const picker = await read("components/transaction-category-select.tsx");
  const manager = await read("components/category-manager-grid.tsx");
  const actions = await read("features/categories/actions.ts");
  assert.match(picker, /setTimeout\([\s\S]*360/);
  assert.match(picker, /reorderCategoriesAction/);
  assert.match(manager, /Giữ một block để kéo sắp xếp/);
  assert.match(actions, /export async function reorderCategoriesAction/);
  assert.match(actions, /sort_order: \(index \+ 1\) \* 10/);
});

test("V1.1.9 removes the unexplained category-page Transactions shortcut", async () => {
  const page = await read("app/(dashboard)/categories/page.tsx");
  assert.doesNotMatch(page, /href="\/transactions"/);
  assert.match(page, /CategoryManagerGrid/);
  assert.match(page, /editing \? await loadCategoryUsageCounts/);
});

test("V1.1.9 batches transaction validation lookups to reduce save latency", async () => {
  const actions = await read("features/transactions/actions.ts");
  assert.match(actions, /categoryPromise/);
  assert.match(actions, /depositPromise/);
  assert.match(actions, /goalPromise/);
  assert.match(actions, /Promise\.all\(\[\s*categoryPromise,[\s\S]*supported_currencies[\s\S]*depositPromise,[\s\S]*goalPromise/);
  assert.match(actions, /Fetch all validation rows in parallel/);
  assert.match(actions, /revalidateAfterCreate/);
});

test("V1.1.9 release metadata is current", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const version = await read("lib/app-version.ts");
  assert.equal(pkg.version, "1.1.9");
  assert.match(version, /APP_VERSION = "1\.1\.9"/);
  assert.match(version, /APP_RELEASE_NAME = "Category Grid & Save Performance Fix"/);
});
