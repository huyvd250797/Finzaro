import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const sw = read("public/sw.js");
const register = read("components/pwa-register.tsx");
const versionRoute = read("app/api/version/route.ts");
const nextConfig = read("next.config.ts");
const manifest = read("app/manifest.ts");
const bootstrap = read("app/pwa/route.ts");
const auth = read("lib/auth.ts");

test("service worker waits for explicit user update confirmation", () => {
  assert.match(sw, /event\.data\?\.type === "SKIP_WAITING"/);
  assert.match(sw, /self\.skipWaiting\(\)/);
  assert.match(sw, /searchParams\.get\("v"\)/);
  assert.match(sw, /finzaro-static-v\$\{APP_VERSION\}/);
});

test("PWA registration detects service worker and server version updates", () => {
  assert.match(register, /sw\.js\?v=\$\{encodeURIComponent\(APP_VERSION\)\}/);
  assert.match(register, /updateViaCache: "none"/);
  assert.match(register, /registration\.update\(\)/);
  assert.match(register, /\/api\/version/);
  assert.match(register, /visibilitychange/);
  assert.match(register, /Cập nhật ngay/);
  assert.match(register, /controllerchange/);
});

test("version endpoint and service worker are delivered without stale cache", () => {
  assert.match(versionRoute, /APP_VERSION/);
  assert.match(versionRoute, /no-store/);
  assert.match(nextConfig, /source: "\/sw\.js"/);
  assert.match(nextConfig, /no-store, no-cache/);
});

test("installed PWA starts through public auth bootstrap", () => {
  assert.match(manifest, /start_url: "\/pwa\?source=homescreen"/);
  assert.match(bootstrap, /\/login/);
  assert.match(bootstrap, /\/overview/);
  assert.match(auth, /optionalUser/);
  assert.match(auth, /new URLSearchParams/);
  assert.match(auth, /redirect\(`\/login\?\$\{params\.toString\(\)\}`\)/);
});

test("authenticated HTML remains network-only with server-error recovery", () => {
  assert.match(sw, /event\.request\.mode === "navigate"/);
  assert.match(sw, /fetch\(event\.request, \{ cache: "no-store" \}\)/);
  assert.match(sw, /response\.status >= 500/);
  assert.match(sw, /\/pwa-error/);
  assert.doesNotMatch(sw, /STATIC_SHELL.*overview/);
});
