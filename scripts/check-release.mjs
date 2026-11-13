// Source-only preflight before Next type-check and bundle: runs without dependencies.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (relative) => readFileSync(join(root, relative), "utf8");
const pkg = JSON.parse(read("package.json"));
const appVersion = read("lib/app-version.ts").match(/APP_VERSION\s*=\s*["']([^"']+)/)?.[1];
const vercel = JSON.parse(read("vercel.json"));
const scripts = pkg.scripts ?? {};
const releaseStages = ["npm run lint", "npm run typecheck", "npm run test", "npm run build"];
const errors = [];
const fail = (message) => errors.push(message);

if (vercel.buildCommand !== "npm run check") fail("Vercel must run the full quality gate before deployment");
for (const stage of releaseStages) if (!scripts.check?.includes(stage)) fail(`Release quality gate is missing ${stage}`);
if (!scripts.typecheck?.includes("tsc --noEmit")) fail("TypeScript typecheck must remain strict");
if (pkg.version !== appVersion) fail(`Version mismatch: package ${pkg.version}, app ${appVersion}`);
if (existsSync(join(root, "_diagnostic_only_external_shims.d.ts"))) fail("Offline-only ambient TypeScript shims are not allowed in production source; run npm run source:sync.");
if (pkg.dependencies?.next !== pkg.devDependencies?.["eslint-config-next"]) fail("Next and eslint-config-next versions differ");
if (pkg.dependencies?.react !== pkg.dependencies?.["react-dom"]) fail("React and react-dom versions differ");
if (Number(pkg.dependencies?.next?.split(".")[0]) < 16 || Number(pkg.dependencies?.next?.split(".")[1]) < 4 || Number(pkg.dependencies?.next?.split(".")[2]) < 5) fail("Next.js is below the security-patched 16.4.5 baseline");
if (/ignoreBuildErrors|ignoreDuringBuilds/.test(read("next.config.ts"))) fail("Production build diagnostics must never be ignored");

const expected = ["overview", "transactions", "accounts", "categories", "reports", "settings"].sort();
const found = readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
if (expected.join("|") !== found.join("|")) fail(`Unexpected active routes: ${found.join(", ")}. Run npm run source:sync before committing; GitHub ZIP-overwrite uploads do not delete tracked legacy folders.`);
for (const rpc of ["create_simple_transaction_v120", "update_simple_transaction_v120", "delete_simple_transaction_v120"]) {
  if (!read("features/transactions/actions.ts").includes(rpc)) fail(`Transaction RPC missing: ${rpc}`);
}

const files = [];
function collect(dir) {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collect(path);
    else if ([".ts", ".tsx", ".js", ".jsx", ".mjs"].includes(extname(entry.name))) files.push(path);
  }
}
for (const dir of ["app", "components", "features", "lib", "scripts"]) collect(dir);
const extensions = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", "/index.ts", "/index.tsx", "/index.js"];
let checked = 0;
for (const file of files) {
  const code = read(file);
  const matches = code.matchAll(/(?:from\s*|import\(\s*|import\s*)["']((?:@\/|\.\.?\/)[^"']+)["']/g);
  for (const match of matches) {
    const source = match[1];
    const basename = source.startsWith("@/") ? source.slice(2) : join(dirname(file), source);
    checked++;
    if (!extensions.some((extension) => existsSync(join(root, basename + extension)))) fail(`Unresolved import: ${file} -> ${source}`);
  }
}

const reportsServer = read("app/(dashboard)/reports/page.tsx");
if (/import\s*\{[^}]*reportSliceColor[^}]*\}\s*from\s*["']@\/components\/report-donut/.test(reportsServer)) fail("Server Reports invokes a helper from a client module");
if (!read("components/report-donut.tsx").startsWith('"use client"')) fail("Interactive reports pie must be a client component");

if (errors.length) {
  for (const error of errors) console.error(`[Finzaro release] ${error}`);
  process.exit(1);
}
console.log(`[Finzaro release] OK v${appVersion}: ${expected.length} modules, ${files.length} sources, ${checked} local imports`);
