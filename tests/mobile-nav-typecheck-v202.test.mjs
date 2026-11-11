import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const code = readFileSync(join(root, "components/mobile-nav.tsx"), "utf8");
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require(join(dirname(process.execPath), "../lib/node_modules/typescript")); }

function extractArray(name) {
  const parsed = ts.createSourceFile("mobile-nav.tsx", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const statement of parsed.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
        assert.ok(declaration.initializer && ts.isArrayLiteralExpression(declaration.initializer));
        return `const ${declaration.getText(parsed)}`;
      }
    }
  }
  throw new Error(`Missing array ${name}`);
}

test("mobile-nav shortcut style is always a string for every kind of sheet", () => {
  assert.doesNotMatch(code, /"style"\s+in\s+item/, "Never infer unknown style via an in-operator on a mixed union");
  assert.match(code, /className=\{cn\([^}]*item\.style\)/);
  for (const color of ["rose", "emerald", "sky"]) assert.match(code, new RegExp(`text-${color}-600`));

  // Compile the two ACTUAL source arrays together with the strict `cn()` signature.
  // This reproduces TS2345 when one list lacks a string style property.
  const icons = ["WalletCards", "Shapes", "Settings2", "ArrowUpRight", "ArrowDownLeft", "ArrowLeftRight"];
  const scenario = [
    ...icons.map((icon) => `declare const ${icon}: { icon: string };`),
    extractArray("moduleItems") + ";",
    extractArray("quickTransactions") + ";",
    "declare function cn(...classes: (string | false | null | undefined)[]): string;",
    "const chosen = Math.random() > 0.5 ? moduleItems : quickTransactions;",
    'chosen.forEach((item) => cn("base", item.style));'
  ].join("\n");
  const name = "/virtual/finzaro-mobile-nav-typecheck.ts";
  const options = { strict: true, noEmit: true, target: ts.ScriptTarget.ES2020, skipLibCheck: true };
  const host = ts.createCompilerHost(options);
  const origGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    fileName === name ? ts.createSourceFile(fileName, scenario, languageVersion, true) :
      origGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  host.fileExists = ((original) => (fileName) => fileName === name || original(fileName))(host.fileExists.bind(host));
  host.readFile = ((original) => (fileName) => fileName === name ? scenario : original(fileName))(host.readFile.bind(host));
  const program = ts.createProgram([name], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.deepEqual(diagnostics.map((d) => `${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`), []);
});
