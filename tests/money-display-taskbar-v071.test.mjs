import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("money calculator groups visible thousands with dots and keeps decimal input canonical", async () => {
  const source = await read("components/money-calculator-input.tsx");
  assert.match(source, /groupedWhole = whole\.replace\([^\n]+, "\."\)/);
  assert.match(source, /fraction !== undefined \? `,\$\{fraction\}`/);
  assert.match(source, /label: decimalDigits > 0 \? "\." : "00"/);
  assert.match(source, /value=\{currentValue\}/);
  assert.match(source, /displayValue \|\| displayPlaceholder/);
});

test("mobile taskbar reserves room for the plus button without paint clipping", async () => {
  const nav = await read("components/mobile-nav.tsx");
  const css = await read("app/globals.css");
  const layout = await read("app/(dashboard)/layout.tsx");
  const pwa = await read("components/pwa-register.tsx");
  assert.match(nav, /fin-mobile-taskbar[^\n]+overflow-visible[^\n]+pt-7/);
  assert.doesNotMatch(nav, /group -mt-7/);
  assert.match(nav, /className="absolute -top-6 left-1\/2 grid size-13/);
  assert.doesNotMatch(css, /contain:\s*layout paint/);
  assert.match(css, /\.fin-mobile-taskbar[\s\S]*?overflow:\s*visible/);
  assert.match(css, /\.fin-mobile-taskbar[\s\S]*?bottom:\s*0\s*!important/);
  assert.match(layout, /pb-\[calc\(7rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(pwa, /bottom-\[calc\(6\.25rem\+env\(safe-area-inset-bottom\)\)\]/);
});
