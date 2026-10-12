// Met à jour le texte de repli des forfaits dans index.html à partir de assets/js/plans.js.
// Usage : node scripts/rename-plans.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('..', import.meta.url);
const ctx = { window: {} };
vm.runInNewContext(readFileSync(new URL('assets/js/plans.js', root), 'utf8'), ctx);
const plans = ctx.window.KOLTZ_PLANS;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const file = new URL('index.html', root);
let html = readFileSync(file, 'utf8'), n = 0;
for (const p of plans) for (const f of Object.keys(p)) {
  if (f === 'id') continue;
  const re = new RegExp(`(<[a-z]+[^>]*data-plan="${p.id}" data-field="${f}"[^>]*>)([^<]*)(<)`, 'g');
  html = html.replace(re, (_, a, _old, c) => { n++; return a + esc(p[f]) + c; });
}
writeFileSync(file, html);
console.log(`${n} textes de forfaits mis à jour dans index.html`);
