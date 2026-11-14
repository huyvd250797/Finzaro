import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const read = (relative) => readFileSync(join(root, relative), "utf8");
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); }
catch { ts = require(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript")); }

const source = read("features/reports/reconcile-snapshot.ts");
const typeFixture = `
  type DonutSlice = { id?: string; amount: number };
  type Bucket = { amount: number; count: number };
  type Category = { id: string; amount: number; count: number; buckets: Bucket[] };
  type Flow = { amount: number; slices: DonutSlice[]; categories: Category[] };
  type FastPeriodSnapshot = {
    totals: { income: number; expense: number; net: number };
    flows: Record<"income" | "expense", Flow>;
  };
`;
function semanticErrors(implementation) {
  const virtualPath = join(root, "__v416_snapshot_typecheck__.ts");
  const code = typeFixture + "\n" + implementation.replace(/^import type \{ FastPeriodSnapshot \} from .*?;\s*/m, "");
  const options = { strict: true, noEmit: true, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, skipLibCheck: true };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, version, onError, shouldCreateNewSourceFile) =>
    file === virtualPath ? ts.createSourceFile(file, code, version, true) : getSourceFile(file, version, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram([virtualPath], options, host);
  return ts.getPreEmitDiagnostics(program).filter((d) => d.category === ts.DiagnosticCategory.Error);
}

function compiled() {
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const result = { exports: {} };
  new Function("module", "exports", "require", js)(result, result.exports, () => { throw new Error("Unexpected runtime dependency"); });
  return result.exports.reconcilePeriodSnapshot;
}

function fixture(sliceId = "food", sliceAmount = 40) {
  const group = { id: "food", amount: 40, count: 1, buckets: [{ amount: 40, count: 1 }] };
  const income = { amount: 0, slices: [], categories: [] };
  return {
    totals: { income: 0, expense: 40, net: -40 },
    flows: { income, expense: { amount: 40, slices: [{ id: sliceId, amount: sliceAmount }], categories: [group] } }
  };
}

test("V4.2.0 typechecks financial snapshot reconciliation with an optional DonutSlice.id", () => {
  assert.deepEqual(semanticErrors(source).map((d) => ({ code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, " ") })), []);
});

test("V4.2.0 TS regression fixture reproduces original TS2345 without the guard", () => {
  const oldSource = source.replace(
    /typeof slice\.id !== "string" \|\| !slice\.id \|\| !amountOk\(slice\.amount\)/,
    "!amountOk(slice.amount)"
  );
  assert.notEqual(oldSource, source, "Fixture must recreate the unsafe expression");
  const errors = semanticErrors(oldSource);
  assert.ok(errors.some((d) => d.code === 2345), `Expected TS2345, received ${errors.map((d) => d.code)}`);
});

test("Financial reconciliation accepts identified categories and rejects missing or mismatched identifiers", () => {
  const reconcile = compiled();
  assert.equal(reconcile(fixture()), true);
  const missingId = fixture();
  delete missingId.flows.expense.slices[0].id;
  assert.equal(reconcile(missingId), false);
  assert.equal(reconcile(fixture(null)), false);
  assert.equal(reconcile(fixture("")), false);
  assert.equal(reconcile(fixture("other")), false);
  assert.equal(reconcile(fixture("food", 39)), false);
});

test("Release gate remains strict: typecheck, lint, tests and build remain enforced", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.version, "4.3.0");
  assert.equal(read("lib/app-version.ts").includes('APP_VERSION = "4.3.0"'), true);
  assert.equal(pkg.scripts.typecheck, "tsc --noEmit");
  assert.match(pkg.scripts.check, /npm run lint && npm run typecheck && npm run test && npm run build/);
  assert.equal(JSON.parse(read("vercel.json")).buildCommand, "npm run check");
});
