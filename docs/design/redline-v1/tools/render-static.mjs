// Renders the Redline ID design artboards (`../source/*.dc.html`) to plain,
// runtime-free HTML (`../static/`) and PNG reference images (`../png/`).
//
// The `.dc.html` files were authored in a claude.ai Design canvas. They are
// ordinary HTML plus a tiny template layer: `{{path}}` holes, `<sc-for>`,
// `<sc-if>`, `<dc-import>`, and a `class Component extends DCLogic` whose
// `renderVals()` supplies the hole values. This script implements just enough
// of that layer to freeze each artboard in its default state.
//
// Usage (needs Playwright + Chromium and network access to Google Fonts):
//   node docs/design/redline-v1/tools/render-static.mjs
// In environments where Playwright is installed globally, set NODE_PATH to the
// global node_modules (e.g. NODE_PATH=$(npm root -g)).

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const srcDir = join(root, 'source');
const staticDir = join(root, 'static');
const pngDir = join(root, 'png');
mkdirSync(staticDir, { recursive: true });
mkdirSync(pngDir, { recursive: true });

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const canvas = JSON.parse(readFileSync(join(srcDir, 'canvas.json'), 'utf8'));
const files = Object.fromEntries(
  readdirSync(srcDir)
    .filter((f) => f.endsWith('.dc.html'))
    .map((f) => [f, readFileSync(join(srcDir, f), 'utf8')]),
);

/** Runs inside the page: expands one artboard's template into static DOM. */
function expandInPage([sources, entry]) {
  function parts(src) {
    const body = src.match(/<x-dc>([\s\S]*?)<\/x-dc>/)[1];
    const helmet = (body.match(/<helmet>([\s\S]*?)<\/helmet>/) || [, ''])[1];
    const markup = body.replace(/<helmet>[\s\S]*?<\/helmet>/, '');
    const scriptTag = src.match(/<script type="text\/x-dc"[^>]*data-props='([^']*)'[^>]*>([\s\S]*?)<\/script>/);
    const propsDecl = scriptTag ? JSON.parse(scriptTag[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&')) : {};
    const code = scriptTag ? scriptTag[2] : 'class Component extends DCLogic { renderVals() { return {}; } }';
    return { helmet, markup, propsDecl, code };
  }
  function valsFor(p, extraProps) {
    class DCLogic {
      constructor(props) { this.props = props; this.state = undefined; }
      setState() {}
      forceUpdate() {}
    }
    const props = {};
    for (const [k, v] of Object.entries(p.propsDecl)) if (!k.startsWith('$') && v && 'default' in v) props[k] = v.default;
    Object.assign(props, extraProps || {});
    // eslint-disable-next-line no-new-func
    const Component = new Function('DCLogic', `${p.code}\nreturn Component;`)(DCLogic);
    const c = new Component(props);
    return c.renderVals();
  }
  const lookup = (scope, expr) => {
    const e = expr.trim();
    if (e === 'true') return true;
    if (e === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(e)) return Number(e);
    return e.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
  };
  const fill = (str, scope) =>
    str.replace(/\{\{([^}]+)\}\}/g, (_, ex) => {
      const v = lookup(scope, ex);
      return v == null || typeof v === 'function' ? '' : String(v);
    });
  const whole = (str) => {
    const m = str.match(/^\s*\{\{([^}]+)\}\}\s*$/);
    return m ? m[1] : null;
  };
  function render(node, scope) {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) {
        child.textContent = fill(child.textContent, scope);
        continue;
      }
      if (child.nodeType !== 1) continue;
      const tag = child.tagName.toLowerCase();
      if (tag === 'sc-for') {
        const list = lookup(scope, whole(child.getAttribute('list')) || '') || [];
        const as = child.getAttribute('as') || 'item';
        const frag = document.createDocumentFragment();
        list.forEach((item, i) => {
          const holder = document.createElement('div');
          for (const n of child.childNodes) holder.appendChild(n.cloneNode(true));
          render(holder, { ...scope, [as]: item, $index: i });
          while (holder.firstChild) frag.appendChild(holder.firstChild);
        });
        child.replaceWith(frag);
        continue;
      }
      if (tag === 'sc-if') {
        const v = lookup(scope, whole(child.getAttribute('value')) || '');
        if (v) {
          render(child, scope);
          child.replaceWith(...Array.from(child.childNodes));
        } else child.remove();
        continue;
      }
      if (tag === 'dc-import') {
        const name = child.getAttribute('name');
        const sub = build(`${name}.dc.html`);
        const wrap = document.createElement('div');
        wrap.innerHTML = sub;
        child.replaceWith(...Array.from(wrap.childNodes));
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        if (/^on[A-Z]/.test(attr.name) || /^on[a-z]+$/.test(attr.name) || attr.name.startsWith('hint-')) {
          child.removeAttribute(attr.name);
        } else if (attr.value.includes('{{')) {
          child.setAttribute(attr.name, fill(attr.value, scope));
        }
      }
      render(child, scope);
    }
  }
  function build(file) {
    const p = parts(sources[file]);
    const vals = valsFor(p);
    const holder = document.createElement('div');
    holder.innerHTML = p.markup;
    render(holder, vals);
    return holder.innerHTML;
  }
  const p = parts(sources[entry]);
  return { helmet: p.helmet, html: build(entry) };
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');

for (const [file, board] of Object.entries(canvas.boards)) {
  const { helmet, html } = await page.evaluate(expandInPage, [files, file]);
  const title = (files[file].match(/<title>([^<]*)<\/title>/) || [, file])[1];
  // Point at the vendored latin font subsets (static/fonts/) so the static
  // mockups and screenshots render offline with the real faces.
  const localHelmet = helmet.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="fonts/fonts.css">');
  const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${board.w}">
<title>${title} — Redline ID mockup (static render)</title>
<!-- Generated by tools/render-static.mjs from source/${file}. Do not edit; edit the source artboard. -->
${localHelmet.trim()}
</head>
<body>
${html.trim()}
</body>
</html>
`;
  const out = join(staticDir, file.replace('.dc.html', '.html'));
  writeFileSync(out, doc);

  const shot = await browser.newPage({ viewport: { width: board.w, height: board.h }, deviceScaleFactor: 2 });
  await shot.goto(`file://${out}`);
  await shot.evaluate(() => document.fonts.ready);
  await shot.waitForTimeout(300);
  await shot.screenshot({ path: join(pngDir, file.replace('.dc.html', '.png')), clip: { x: 0, y: 0, width: board.w, height: board.h } });
  await shot.close();
  console.log(`rendered ${file} (${board.w}x${board.h})`);
}

await browser.close();
