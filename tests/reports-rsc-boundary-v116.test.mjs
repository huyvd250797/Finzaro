import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

function moduleAlias(path) {
  return `@/${relative(root, path).replaceAll("\\", "/").replace(/\.(tsx?|jsx?)$/, "")}`;
}

test("V1.1.8 keeps Reports server/client boundary safe without a chart-only palette dependency", async () => {
  const page = await read("app/(dashboard)/reports/page.tsx");
  const donut = await read("components/report-donut.tsx");

  assert.match(donut, /^"use client";/);
  assert.match(page, /import \{ ReportDonut \} from "@\/components\/report-donut"/);
  assert.doesNotMatch(page, /reportSliceColor/);
  assert.doesNotMatch(donut, /reportSliceColor/);
  assert.match(page, /color: iconColorValue\(item\.icon_color\)/);
  assert.match(donut, /slice\.color/);
});

test("Reports server routes do not import executable lower-case helpers from use-client modules", async () => {
  const allSource = (await walk(root)).filter((path) => [".ts", ".tsx"].includes(extname(path)));
  const clientAliases = new Set();
  for (const path of allSource) {
    const source = await readFile(path, "utf8");
    if (/^\s*["']use client["'];/.test(source)) clientAliases.add(moduleAlias(path));
  }

  const reportFiles = (await walk(join(root, "app", "(dashboard)", "reports"))).filter((path) => extname(path) === ".tsx");
  const violations = [];
  for (const path of reportFiles) {
    const source = await readFile(path, "utf8");
    if (/^\s*["']use client["'];/.test(source)) continue;
    const importRe = /import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["']/gs;
    for (const match of source.matchAll(importRe)) {
      if (!clientAliases.has(match[2])) continue;
      const names = match[1].split(",").map((part) => part.trim().replace(/^type\s+/, "").split(/\s+as\s+/).at(-1));
      for (const name of names) {
        // Components/classes start uppercase and types are erased. Lower-case named exports
        // from a client module are executable boundary leaks when invoked by a Server Component.
        if (name && /^[a-z_$]/.test(name)) violations.push(`${relative(root, path)} -> ${match[2]}:${name}`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test("V1.1.8 release metadata is current", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const version = await read("lib/app-version.ts");
  assert.equal(pkg.version, "1.1.8");
  assert.match(version, /APP_VERSION = "1\.1\.8"/);
  assert.match(version, /Calendar Interaction & Performance Fix/);
});
