import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const readme = readFileSync(new URL('README.md', root), 'utf8');
const assetPath = 'assets/executor-compare/background.png';

// Mirrors the browser surface used by the shipped scripts so both the new block
// and every existing control are exercised from the real page markup.
function openPage() {
  const elements = new Map();
  for (const match of html.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>([^<]*)/g)) {
    const [, , attributes, id, text] = match;
    const attrs = new Map([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    const classes = new Set((attrs.get('class') ?? '').split(/\s+/));
    const listeners = new Map();
    elements.set('#' + id, {
      textContent: text, hidden: /\bhidden\b/.test(attributes), complete: false, naturalWidth: 0,
      setAttribute: (name, value) => attrs.set(name, value),
      getAttribute: name => attrs.get(name),
      classList: {
        toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); },
        contains: name => classes.has(name),
      },
      addEventListener(name, handler) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(handler);
      },
      emit(name) {
        assert.ok(listeners.has(name), `Missing ${name} handler on ${id}`);
        for (const handler of listeners.get(name)) handler();
      },
    });
  }
  const context = { document: { querySelector: selector => elements.get(selector) ?? null } };
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    runInNewContext(match[1], context);
  }
  return id => elements.get('#' + id);
}

test('the project description block is visible and keeps the collaborator art path as a background', () => {
  const sections = [...html.matchAll(/<section\b[^>]*\bid="executor-compare"[^>]*>([\s\S]*?)<\/section>/g)];
  assert.equal(sections.length, 1);
  const markup = sections[0][0];
  const opening = markup.slice(0, markup.indexOf('>') + 1);
  assert.doesNotMatch(opening, /\b(?:hidden|style|aria-hidden)\b/i);
  assert.match(opening, /aria-labelledby="executor-compare-title"/);
  assert.match(markup, /<h2 id="executor-compare-title">山间专注 · 协作试验<\/h2>/);
  assert.match(markup, /<p id="executor-compare-note">[^<]*assets\/executor-compare\/background\.png[^<]*CSS 占位[^<]*<\/p>/);
  // The art layer is decorative and CSS-only, so a missing file cannot break layout or scripts.
  assert.equal((html.match(/\bid="executor-compare-art"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<img\b[^>]*assets\/executor-compare/i);
  assert.equal([...html.matchAll(/<img\b/g)].length, 1);
  // The block sits inside the shared workspace so the existing responsive grid still applies.
  const workspace = html.match(/<div class="workspace" id="workspace">([\s\S]*?)<script>/)[1];
  assert.ok(workspace.includes('id="executor-compare"'));
  assert.ok(workspace.indexOf('id="executor-compare"') > workspace.indexOf('</main>'));
});

test('the new block uses a relative background plus a CSS placeholder when the PNG has not arrived', () => {
  const style = html.match(/<style id="executor-art-styles">([\s\S]*?)<\/style>/);
  assert.ok(style, 'missing executor art stylesheet');
  const css = style[1];
  assert.match(css, /\.executor-compare\s*\{[^}]*grid-column: 1 \/ -1;/);
  assert.match(css, new RegExp(`background-image:\\s*url\\("${assetPath}"\\),\\s*linear-gradient\\(`));
  assert.match(css, /background-color:\s*#[0-9a-f]{3,8};/i);
  assert.match(css, /background-size:\s*cover, cover;/);
  assert.match(css, /aspect-ratio:\s*16 \/ 9;/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.executor-compare\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
  // No rule may hide the block or its placeholder.
  const blockRules = [...css.matchAll(/\.executor-compare(?:-art|-copy)?\s*\{[^}]*\}/g)].map(m => m[0]).join('\n');
  assert.doesNotMatch(blockRules, /(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?:\s|;|}))/i);
  // The relative path must not escape the delivered site root.
  assert.doesNotMatch(css, /url\("(?:\.\.\/|\/)/);
});

test('existing counter, add-ten, focus mode and both fixed notes survive the new block', () => {
  const get = openPage();
  const click = id => get(id).emit('click');
  const verify = (count, operations, focused) => {
    assert.equal(get('count').textContent, String(count));
    assert.equal(get('operations').textContent, String(operations));
    assert.equal(get('counter-summary').textContent, `当前计数：${count}；累计操作：${operations}`);
    assert.equal(get('workspace').classList.contains('is-focused'), focused);
    assert.equal(get('focus-toggle').getAttribute('aria-pressed'), String(focused));
    for (const [id, text] of [
      ['project-description', '连续开发验证项目'],
      ['workflow-status', '先记录，再推进'],
      ['workspace-note', '先验证，再扩展'],
    ]) {
      assert.equal(get(id).textContent, text);
      assert.equal(get(id).hidden, false);
    }
    assert.equal(get('executor-compare').hidden, false);
    assert.match(get('executor-compare-note').textContent, /assets\/executor-compare\/background\.png/);
  };
  verify(0, 0, false);
  click('increment');
  click('addTen');
  click('decrement');
  verify(10, 3, false);
  click('focus-toggle');
  get('mountain-image').emit('error');
  assert.equal(get('mountain-image').hidden, true);
  assert.equal(get('image-placeholder').hidden, false);
  assert.equal(get('executor-compare').hidden, false);
  click('reset');
  click('reset');
  verify(0, 5, true);
  get('mountain-image').naturalWidth = 1672;
  get('mountain-image').emit('load');
  click('focus-toggle');
  assert.equal(get('mountain-image').hidden, false);
  assert.equal(get('image-placeholder').hidden, true);
  click('addTen');
  verify(10, 6, false);
  const fresh = openPage();
  assert.equal(fresh('count').textContent, '0');
  assert.equal(fresh('operations').textContent, '0');
  assert.equal(fresh('executor-compare').hidden, false);
});

test('README documents the collaborator block, its relative asset path and the placeholder contract', () => {
  assert.match(readme, /## V08/);
  assert.match(readme, /executor-compare/);
  assert.ok(readme.includes(assetPath));
  assert.match(readme, /CSS 占位/);
  assert.match(readme, /tests\/executor-compare\.test\.mjs/);
  assert.match(readme, /assets\/v04/);
});
