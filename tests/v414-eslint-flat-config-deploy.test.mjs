import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(join(root, path), 'utf8');

test('V4.2.0 hotfix bumps app version while pinning ESLint 9.17', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.version, '4.5.0');
  assert.equal(pkg.devDependencies.eslint, '9.17.0');
});

test('ESLint flat config avoids exports unavailable in ESLint 9.17.0', () => {
  const config = read('eslint.config.mjs');
  execFileSync(process.execPath, ['--check', join(root, 'eslint.config.mjs')]);
  assert.doesNotMatch(config, /(?:from\s*['"]eslint\/config['"]|import\s*\(\s*['"]eslint\/config['"]\s*\))/);
  assert.doesNotMatch(config, /\b(?:defineConfig|globalIgnores)\s*\(/);
  assert.match(config, /export\s+default\s+config/);
  assert.match(config, /\.\.\.nextVitals/);
  assert.match(config, /\.\.\.nextTs/);
  for (const pattern of ['.next/**', 'out/**', 'build/**', 'next-env.d.ts']) {
    assert.ok(config.includes(JSON.stringify(pattern)), `Missing global ignore: ${pattern}`);
  }
});

test('Release Quality Gate stays active in V4.2.0', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.check, /npm run lint\s*&&\s*npm run typecheck\s*&&\s*npm run test\s*&&\s*npm run build/);
  assert.equal(JSON.parse(read('vercel.json')).buildCommand, 'npm run check');
  const ci = read('.github/workflows/ci.yml');
  for (const script of ['lint', 'typecheck', 'test', 'build']) {
    assert.match(ci, new RegExp(`npm run ${script}`));
  }
});
