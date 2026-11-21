import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const root = resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(join(root, file), 'utf8');
const require = createRequire(import.meta.url);
const ts = require('typescript');

test('V4.6.10 accounts page declares its financial summary variables exactly once', () => {
  const source = ts.createSourceFile('accounts/page.tsx', read('app/(dashboard)/accounts/page.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(source.parseDiagnostics.length, 0, 'accounts page must parse without errors');
  const fn = source.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'AccountsPage');
  assert.ok(fn?.body, 'AccountsPage must exist');
  const seen = new Map();
  for (const statement of fn.body.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      const key = declaration.name.text;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
  }
  for (const name of ['defaultMeta', 'activeAccounts', 'balances']) assert.equal(seen.get(name), 1, `${name} must be declared once`);
  for (const [name,count] of seen) assert.equal(count, 1, `Duplicate top-level variable in AccountsPage: ${name}`);
  assert.equal(seen.has('regularAccounts'), false);
  assert.equal(seen.has('familyAccounts'), false);
});

test('V4.6.10 release metadata is incremented without new migration', () => {
  const packageJson = JSON.parse(read('package.json'));
  assert.equal(packageJson.version, '4.6.10');
  assert.match(read('lib/app-version.ts'), /APP_VERSION = "4\.6\.10"/);
  assert.match(read('lib/app-version.ts'), /Accounts Redeclaration Deploy Hotfix/);
  assert.match(read('README.md'), /Current release: Finzaro V4\.6\.10/);
  assert.match(read('CHANGELOG.md'), /^## V4\.6\.10/);
  assert.match(read('DEPLOY_V4.6.10.md'), /không cần chạy migration SQL mới/i);
});
