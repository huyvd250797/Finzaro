import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const actions = readFileSync(resolve(root, "features/transactions/actions.ts"), "utf8");

test("V1.2.2 edit transaction does not access nullable query data inside currency callback", () => {
  const edit = actions.split("export async function updateTransactionAction(")[1];
  assert.ok(edit, "edit action must exist");
  assert.match(edit, /const account = accountResult\.data;/);
  assert.match(edit, /if \(accountResult\.error \|\| !account \|\| account\.is_archived/);
  assert.match(edit, /if \(currencyResult\.error \|\| !currencyResult\.data\)/);
  assert.match(edit, /\.find\(c => c\.code === account\.currency_code\)/);
  assert.doesNotMatch(edit, /\.find\([^\n]*accountResult\.data/);
});

test("deploy-fix release is versioned and does not alter transaction RPCs", () => {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  assert.ok(/^(?:2\.(?:[2-9]|[1-9]\d+)\.|(?:3|4)\.\d+\.)/.test(pkg.version), "release should retain V2.2 baseline");
  const version = readFileSync(resolve(root, "lib/app-version.ts"), "utf8");
  assert.match(version, /APP_VERSION\s*=\s*"(?:2\.[2-9]\.\d+|(?:3|4)\.\d+\.\d+)"/);
  assert.match(actions, /rpc\("update_simple_transaction_v120"/);
  assert.match(actions, /rpc\("create_simple_transaction_v120"/);
  assert.match(actions, /rpc\("delete_simple_transaction_v120"/);
});
