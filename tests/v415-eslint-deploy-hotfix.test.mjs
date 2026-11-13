import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const read = relative => readFileSync(join(root, relative), "utf8");
const pkg = JSON.parse(read("package.json"));

test("V4.1.5 keeps ESLint 9.17, which does not export eslint/config", () => {
  assert.equal(pkg.version, "4.1.5");
  assert.equal(pkg.devDependencies.eslint, "9.17.0");
  const config = read("eslint.config.mjs");
  assert.doesNotMatch(config, /from\s+["']eslint\/config["']/);
  assert.doesNotMatch(config, /\bdefineConfig\s*\(/);
  assert.doesNotMatch(config, /\bglobalIgnores\s*\(/);
});

test("Flat config retains both Next.js rule sets and global ignores", () => {
  const config = read("eslint.config.mjs");
  assert.match(config, /from\s+["']eslint-config-next\/core-web-vitals["']/);
  assert.match(config, /from\s+["']eslint-config-next\/typescript["']/);
  assert.match(config, /export\s+default\s*\[/);
  assert.match(config, /\.\.\.nextVitals/);
  assert.match(config, /\.\.\.nextTs/);
  assert.match(config, /\{\s*ignores:\s*\[/);
  for (const path of [".next/**", "out/**", "build/**", "next-env.d.ts"]) {
    assert.ok(config.includes(`"${path}"`), `expected global ignore ${path}`);
  }
  execFileSync(process.execPath, ["--check", join(root, "eslint.config.mjs")], {stdio:"pipe"});
});

test("Release gate still blocks Vercel deploy on lint, typecheck, tests or build failure", () => {
  const vercel = JSON.parse(read("vercel.json"));
  assert.equal(vercel.buildCommand, "npm run check");
  for (const stage of ["lint","typecheck","test","build"]) {
    assert.ok(pkg.scripts.check.includes(`npm run ${stage}`));
  }
  assert.equal(pkg.scripts.lint, "eslint .");
  assert.equal(pkg.scripts.typecheck, "tsc --noEmit");
  assert.equal(pkg.scripts.build, "next build");
});
