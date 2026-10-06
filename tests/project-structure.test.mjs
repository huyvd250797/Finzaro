import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const required = [
  "app/manifest.ts",
  "app/api/version/route.ts",
  "app/login/page.tsx",
  "app/register/page.tsx",
  "app/(dashboard)/overview/page.tsx",
  "app/(dashboard)/accounts/page.tsx",
  "app/(dashboard)/transactions/page.tsx",
  "app/(dashboard)/categories/page.tsx",
  "app/(dashboard)/settings/page.tsx",
  "components/category-icon-picker.tsx",
  "components/transaction-category-select.tsx",
  "components/pwa-register.tsx",
  "features/accounts/actions.ts",
  "features/transactions/actions.ts",
  "features/transactions/data.ts",
  "features/categories/actions.ts",
  "features/categories/constants.ts",
  "features/categories/data.ts",
  "features/categories/icons.tsx",
  "lib/app-version.ts",
  "lib/auth.ts",
  "lib/supabase/client.ts",
  "lib/supabase/server.ts",
  "lib/supabase/proxy.ts",
  "proxy.ts",
  "supabase/migrations/20261005110000_foundation_environment.sql",
  "supabase/migrations/20261006134500_account_core.sql",
  "supabase/migrations/20261006150000_transaction_core.sql",
  "supabase/migrations/20261006160000_category_engine.sql",
  "supabase/sql-editor/V0.0.5_category_engine.sql",
  "supabase/sql-editor/V0.0.5_category_engine_verify.sql",
  "supabase/tests/category-engine.test.sql",
  "docs/V0.0.5_CATEGORY_ENGINE_SETUP.md",
  "public/sw.js",
  ".env.example",
  "vercel.json"
];

test("V0.0.5 required files exist", () => {
  for (const file of required) assert.equal(existsSync(file), true, `${file} is missing`);
});

test("package version is 0.0.5", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.version, "0.0.5");
  assert.match(pkg.dependencies.next, /16/);
  assert.ok(pkg.dependencies["@supabase/ssr"]);
});
