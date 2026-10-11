import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V1.1.1 retains the V1.0.2 Next.js security upgrade", async () => {
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(pkg.version, "1.1.3");
  assert.equal(pkg.dependencies.next, "16.4.0");
  assert.equal(pkg.devDependencies["eslint-config-next"], "16.4.0");
  assert.notEqual(pkg.dependencies.next, "16.0.0");
});

test("Next.js 16.4 stack stays on aligned React 19.3", async () => {
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(pkg.dependencies.react, "19.3.0");
  assert.equal(pkg.dependencies["react-dom"], "19.3.0");
  assert.equal(pkg.devDependencies["@types/react"], "19.3.0");
  assert.equal(pkg.devDependencies["@types/react-dom"], "19.3.0");
});
