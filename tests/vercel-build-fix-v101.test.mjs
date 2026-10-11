import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V1.0.1 aligns React runtime and types for Vercel", async () => {
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(pkg.version, "1.0.1");
  assert.equal(pkg.dependencies.react, "19.3.0");
  assert.equal(pkg.dependencies["react-dom"], "19.3.0");
  assert.equal(pkg.devDependencies["@types/react"], "19.3.0");
  assert.equal(pkg.devDependencies["@types/react-dom"], "19.3.0");
  assert.equal(pkg.devDependencies.typescript, "5.9.3");
  assert.equal(pkg.engines.node, "22.x");
  assert.equal(pkg.engines.npm, "10.x");
});

test("Vercel install avoids peer solver backtracking and registry extras", async () => {
  const vercel = JSON.parse(await read("vercel.json"));
  assert.match(vercel.installCommand, /--legacy-peer-deps/);
  assert.match(vercel.installCommand, /--no-audit/);
  assert.match(vercel.installCommand, /--no-fund/);
  const npmrc = await read(".npmrc");
  assert.match(npmrc, /legacy-peer-deps=true/);
  assert.match(npmrc, /audit=false/);
  assert.match(npmrc, /fund=false/);
});

test("app version is V1.0.1 Production Deploy Fix", async () => {
  const version = await read("lib/app-version.ts");
  assert.match(version, /APP_VERSION = "1\.0\.1"/);
  assert.match(version, /APP_RELEASE_NAME = "Production Deploy Fix"/);
});
