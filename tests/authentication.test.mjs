import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const actions = read("app/auth/actions.ts");
const authGuard = read("lib/auth.ts");
const proxy = read("lib/supabase/proxy.ts");
const confirm = read("app/auth/confirm/route.ts");
const dashboard = read("app/(dashboard)/layout.tsx");
const sw = read("public/sw.js");
const env = read(".env.example");

test("real password authentication actions exist", () => {
  assert.match(actions, /signInWithPassword/);
  assert.match(actions, /auth\.signUp/);
  assert.match(actions, /auth\.signOut/);
  assert.match(actions, /resetPasswordForEmail/);
  assert.match(actions, /auth\.updateUser/);
});

test("server authorization verifies claims", () => {
  assert.match(authGuard, /auth\.getClaims\(\)/);
  assert.doesNotMatch(authGuard, /auth\.getSession\(\)/);
  assert.match(proxy, /auth\.getClaims\(\)/);
  assert.doesNotMatch(proxy, /auth\.getSession\(\)/);
  assert.match(dashboard, /requireUser/);
});

test("email confirmation handles token hash and PKCE code", () => {
  assert.match(confirm, /verifyOtp/);
  assert.match(confirm, /exchangeCodeForSession/);
  assert.match(confirm, /safeNext/);
});

test("profile and preference updates use authenticated RLS path", () => {
  assert.match(actions, /from\("profiles"\)\.update/);
  assert.match(actions, /from\("user_preferences"\)/);
  assert.doesNotMatch(actions, /service_role/i);
  assert.doesNotMatch(env, /SERVICE_ROLE/i);
});

test("authenticated navigation is not cached by PWA service worker", () => {
  assert.match(sw, /Never cache authenticated HTML/);
  assert.doesNotMatch(sw, /"\/overview"/);
  assert.match(sw, /event\.request\.mode === "navigate"/);
  assert.doesNotMatch(sw, /cache\.put\(event\.request, copy\).*navigate/s);
});

test("unauthenticated redirect is URL encoded and dashboard is dynamic", () => {
  assert.match(authGuard, /new URLSearchParams/);
  assert.doesNotMatch(authGuard, /redirect\("\/login\?error=[^"]*[À-ỹ]/u);
  assert.match(dashboard, /export const dynamic = "force-dynamic"/);
});

