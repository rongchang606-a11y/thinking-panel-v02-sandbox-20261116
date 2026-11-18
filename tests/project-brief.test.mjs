import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const readme = readFileSync(new URL('README.md', root), 'utf8');
const asset = 'assets/v04/background.png';

test('project brief is one visible block inside the counter with real copy', () => {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  assert.equal((html.match(/\bid="project-brief"/g) ?? []).length, 1);
  const block = main.match(/<section\b[^>]*id="project-brief"[^>]*>([\s\S]*?)<\/section>/);
  assert.ok(block, 'project brief section missing from main');
  assert.doesNotMatch(block.input.slice(block.index, block.index + 80), /\b(?:hidden|style|aria-hidden)\b/);
  assert.match(block[1], /<h2 id="project-brief-title">项目说明<\/h2>/);
  const copy = block[1].match(/<p id="project-brief-text">([^<]+)<\/p>/);
  assert.ok(copy && copy[1].trim().length >= 10);
  assert.doesNotMatch(html, /\.project-brief[^{}]*\{[^}]*(?:display\s*:\s*none|visibility\s*:\s*hidden)/i);
});

test('brief paints the relative background path with a CSS-only gradient placeholder', () => {
  const styles = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const rule = styles.match(/\.project-brief\s*\{([^}]*)\}/)[1];
  assert.match(rule, /background-image:\s*linear-gradient\([^)]*\),\s*url\("assets\/v04\/background\.png"\)/);
  assert.doesNotMatch(rule, /url\("(?:[a-z]+:|\/|\.\.\/)/i);
  assert.doesNotMatch(rule, /data:image/i);
  assert.match(rule, /background-color:\s*#[0-9a-f]{3,8}/i);
  assert.match(rule, /background-size:\s*cover/);
  assert.match(rule, /background-repeat:\s*no-repeat/);
  assert.ok(existsSync(new URL(asset, root)));
  const png = readFileSync(new URL(asset, root)).subarray(0, 8).toString('hex');
  assert.equal(png, '89504e470d0a1a0a');
});

test('the brief adds no second image and survives focused layout', () => {
  assert.equal((html.match(/<img\b/g) ?? []).length, 1);
  const image = html.match(/<img\b[^>]*>/)[0];
  assert.match(image, new RegExp(`src="${asset}"`));
  const focusStyles = html.match(/<style id="focus-styles">([\s\S]*?)<\/style>/)[1];
  assert.doesNotMatch(focusStyles, /project-brief[^{}]*\{[^}]*(?:display\s*:\s*none|visibility\s*:\s*hidden)/i);
});

test('counter, operations and focus keeps working with the new section mounted', () => {
  const elements = new Map();
  for (const match of html.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>([^<]*)/g)) {
    const [, , attributes, id, text] = match;
    const attrs = new Map([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    const classes = new Set((attrs.get('class') ?? '').split(/\s+/));
    const listeners = new Map();
    elements.set(id, {
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
  const context = { document: { querySelector: selector => elements.get(selector.slice(1)) ?? null } };
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    runInNewContext(match[1], context);
  }
  const get = id => elements.get(id);
  const click = id => get(id).emit('click');
  assert.equal(get('project-brief-text').textContent, '山间专注 · 协作试验：开发与美术各自独立推进，用同一份计数页记录每一步进展。');
  click('increment');
  click('addTen');
  click('decrement');
  click('reset');
  assert.equal(get('count').textContent, '0');
  assert.equal(get('operations').textContent, '4');
  assert.equal(get('counter-summary').textContent, '当前计数：0；累计操作：4');
  click('focus-toggle');
  assert.equal(get('workspace').classList.contains('is-focused'), true);
  assert.equal(get('focus-toggle').getAttribute('aria-pressed'), 'true');
  assert.equal(get('project-brief-text').textContent, '山间专注 · 协作试验：开发与美术各自独立推进，用同一份计数页记录每一步进展。');
  click('focus-toggle');
  assert.equal(get('workspace').classList.contains('is-focused'), false);
});

test('README documents the brief, the relative asset and preserved features', () => {
  assert.match(readme, /项目说明区块/);
  assert.match(readme, /assets\/v04\/background\.png/);
  assert.match(readme, /占位/);
  for (const feature of ['累计操作次数', '专注模式', '加十', '重置']) {
    assert.ok(readme.includes(feature), `README must still document ${feature}`);
  }
  assert.match(readme, /V0\.4 开发分工/);
});
