import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20261005110000_foundation_environment.sql");
const migration = fs.readFileSync(migrationPath, "utf8");
const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

test("current package version and Supabase dependencies are present", () => {
  assert.equal(pkg.version, "0.5.0");
  assert.ok(pkg.dependencies["@supabase/ssr"]);
  assert.ok(pkg.dependencies["@supabase/supabase-js"]);
  assert.ok(pkg.devDependencies.supabase);
});

test("environment example uses current publishable key naming", () => {
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_URL=/);
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=/);
  assert.doesNotMatch(envExample, /SERVICE_ROLE/i);
});

test("foundation migration enables RLS and user lifecycle trigger", () => {
  assert.match(migration, /alter table public\.profiles enable row level security/i);
  assert.match(migration, /alter table public\.user_preferences enable row level security/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /after insert on auth\.users/i);
  assert.match(migration, /revoke all on table public\.profiles from anon, authenticated/i);
  assert.match(migration, /revoke execute on function public\.handle_new_user\(\) from public, anon, authenticated/i);
});

test("foundation migration stays scoped before Account Core", () => {
  assert.doesNotMatch(migration, /create table if not exists public\.accounts/i);
  assert.doesNotMatch(migration, /create table if not exists public\.transactions/i);
});
