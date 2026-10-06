import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const required = [
  "app/manifest.ts",
  "app/login/page.tsx",
  "app/register/page.tsx",
  "app/forgot-password/page.tsx",
  "app/reset-password/page.tsx",
  "app/auth/actions.ts",
  "app/auth/confirm/route.ts",
  "app/auth/callback/route.ts",
  "app/(dashboard)/overview/page.tsx",
  "app/(dashboard)/settings/page.tsx",
  "lib/auth.ts",
  "lib/supabase/client.ts",
  "lib/supabase/server.ts",
  "lib/supabase/proxy.ts",
  "proxy.ts",
  "supabase/migrations/20261005110000_foundation_environment.sql",
  "supabase/sql-editor/V0.2_auth_verification.sql",
  "docs/SUPABASE_AUTH_SETUP.md",
  "public/sw.js",
  ".env.example",
  "vercel.json"
];

test("V0.2 required files exist", () => {
  for (const file of required) assert.equal(existsSync(file), true, `${file} is missing`);
});

test("package version is 0.2.0", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.version, "0.2.0");
  assert.match(pkg.dependencies.next, /16/);
  assert.ok(pkg.dependencies["@supabase/ssr"]);
});
