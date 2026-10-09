import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("transactions page keeps credit-card query outside stale generated DB types", async () => {
  const page = await read("app/(dashboard)/transactions/page.tsx");
  assert.match(page, /\(supabase as any\)\.from\("credit_cards"\)/);
  assert.match(page, /const allCardRows = \(activeCards \?\? \[\]\) as Pick<CreditCard,/);
});

test("transaction revalidation uses a unary callback compatible with Next 16", async () => {
  const actions = await read("features/transactions/actions.ts");
  assert.doesNotMatch(actions, /\.forEach\(revalidatePath\)/);
  assert.match(actions, /\.forEach\(\(path\) => revalidatePath\(path\)\)/);
});
