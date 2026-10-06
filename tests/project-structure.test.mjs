import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const required = [
  "app/manifest.ts",
  "app/(dashboard)/overview/page.tsx",
  "app/(dashboard)/accounts/page.tsx",
  "app/(dashboard)/transactions/page.tsx",
  "app/api/health/database/route.ts",
  "lib/supabase/client.ts",
  "lib/supabase/server.ts",
  "lib/supabase/database.types.ts",
  "supabase/config.toml",
  "supabase/seed.sql",
  "supabase/migrations/20261005110000_foundation_environment.sql",
  "public/sw.js",
  ".env.example",
  "vercel.json"
];

test("V0.1.1 required files exist", () => {
  for (const file of required) assert.equal(existsSync(file), true, `${file} is missing`);
});

test("package version is 0.1.1", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.version, "0.1.1");
  assert.match(pkg.dependencies.next, /16/);
});
