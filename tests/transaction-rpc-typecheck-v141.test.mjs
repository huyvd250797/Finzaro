import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const req = createRequire(import.meta.url);
let ts;
try { ts = req("typescript"); }
catch { ts = req(join(dirname(process.execPath), "../lib/node_modules/typescript")); }

const actions = read("features/transactions/actions.ts");
const responseSource = read("features/transactions/rpc-response.ts");

test("V1.4.1 fixes unknown RPC response TS2339 at create/delete/update and duplicate", () => {
  for (const action of ["create", "delete", "update"]) {
    assert.match(actions, new RegExp(`const error = transactionRpcError\\(await measureServerOperation\\("transaction\\.${action}\\.rpc"`));
  }
  assert.equal((actions.match(/transactionRpcError\(await measureServerOperation/g) || []).length, 4); // V3.6.0 adds the inline optimistic-delete action.
  assert.match(actions, /transactionRpcError\(result\)/);
  assert.match(actions, /copy_simple_transaction_batch_v320/);
  assert.doesNotMatch(actions, /const\s*\{\s*error\s*\}\s*=\s*await\s*measureServerOperation/);
  assert.match(actions, /import \{ transactionRpcError \} from "@\/features\/transactions\/rpc-response";/);
  assert.match(actions, /if \(error\) throw new Error\(dbError\(error\)\)/);
});

test("runtime validator rejects malformed RPC envelopes, preserves Supabase errors", () => {
  const { outputText, diagnostics } = ts.transpileModule(responseSource, {
    fileName: "features/transactions/rpc-response.ts",
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  });
  assert.deepEqual((diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error), []);
  const module = { exports: {} };
  new Function("module", "exports", outputText)(module, module.exports);
  const { transactionRpcError } = module.exports;
  assert.equal(transactionRpcError({ data: { id: "tx-1" }, error: null }), null);
  const rpcError = { code: "PGRST202", message: "Unknown function" };
  assert.equal(transactionRpcError({ data: null, error: rpcError }), rpcError);
  for (const invalid of [undefined, null, false, 42, "", {}, { data: "ok" }]) {
    assert.throws(() => transactionRpcError(invalid), /Phản hồi giao dịch từ máy chủ không hợp lệ/);
  }
});

test("strict TypeScript permits unknown timing results only after validation", () => {
  const source = `
    ${responseSource.replace('export function','function')}
    async function measureServerOperation<T>(label: string, op: () => PromiseLike<T>): Promise<T> { return await op(); }
    declare const supabase: any;
    async function simulate() {
      const response = await measureServerOperation("test", () => supabase.rpc("test", {}));
      const error = transactionRpcError(response);
      if (error) throw new Error(String(error));
    }
  `;
  const fileName = "strict-rpc-check.ts";
  const options = { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, strict: true, noEmit: true, skipLibCheck: true };
  const baseHost = ts.createCompilerHost(options);
  const host = { ...baseHost, getSourceFile(name, languageVersion) {
    if (name === fileName) return ts.createSourceFile(name, source, languageVersion, true);
    return baseHost.getSourceFile(name, languageVersion);
  }, readFile(name) { return name === fileName ? source : baseHost.readFile(name); }, fileExists(name) { return name === fileName || baseHost.fileExists(name); } };
  const program = ts.createProgram([fileName], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.deepEqual(diagnostics.map(d => `${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`), []);
});

test("V1.4.1 metadata is versioned without modifying underlying V1.2 RPCs", () => {
  assert.ok((Number(JSON.parse(read("package.json")).version.split(".")[0]) > 2 || Number(JSON.parse(read("package.json")).version.split(".")[1]) >= 2), "release should retain V2.2 baseline");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "(?:2\.[2-9]\.\d+|3\.\d+\.\d+)"/);
  assert.match(read("CHANGELOG.md"), /V1\.7\.0/);
  assert.match(read("DEPLOY_V1.4.1.md"), /No new SQL/);
  for (const rpc of ["create_simple_transaction_v120", "delete_simple_transaction_v120", "update_simple_transaction_v120"]) {
    assert.ok(actions.includes(`rpc("${rpc}"`));
  }
});
