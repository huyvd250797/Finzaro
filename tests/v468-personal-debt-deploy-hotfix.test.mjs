import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {join, resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const read=(path)=>readFileSync(join(root,path),'utf8');

test('V4.6.8 personal-debt request key is stamped on submit without effect-driven state updates',()=>{
  const code=read('components/personal-debt-panel.tsx');
  assert.doesNotMatch(code,/\buseEffect\s*\(/);
  assert.doesNotMatch(code,/\bsetKey\s*\(/);
  assert.match(code,/function stampKey\(event:FormEvent<HTMLFormElement>\)/);
  assert.match(code,/event\.currentTarget\.elements\.namedItem\("request_key"\)/);
  assert.match(code,/if\(field instanceof HTMLInputElement && !field\.value\) field\.value=crypto\.randomUUID\(\)/);
  assert.match(code,/name="request_key" defaultValue=""/);
  assert.equal((code.match(/onSubmit=\{stampKey\}/g)??[]).length,2);
});

test('V4.6.8 package, app, and changelog versions agree and debt SQL remains unchanged',()=>{
  assert.equal(JSON.parse(read('package.json')).version,'4.6.8');
  assert.match(read('lib/app-version.ts'),/APP_VERSION = "4\.6\.8"/);
  assert.match(read('lib/app-version.ts'),/Personal Debt Deploy Hotfix/);
  assert.match(read('CHANGELOG.md'),/^## V4\.6\.8/);
  assert.match(read('DEPLOY_V4.6.8.md'),/no new migration/i);
  assert.equal(readdirSync(join(root,'supabase/migrations')).filter(n=>n.endsWith('.sql')).length,36);
  assert.ok(existsSync(join(root,'supabase/migrations/20261121150000_personal_lending_borrowing_v467.sql')));
});
