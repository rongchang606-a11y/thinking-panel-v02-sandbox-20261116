import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const script = html.match(/<script id="project-art-script">([\s\S]*?)<\/script>/)[1];
const artPath = 'assets/executor-compare/background.png';

function fixture({ complete = false, naturalWidth = 0 } = {}) {
  const elements = new Map();
  for (const id of ['project-art', 'project-art-placeholder']) {
    const handlers = new Map();
    elements.set('#' + id, {
      hidden: id === 'project-art',
      complete,
      naturalWidth,
      addEventListener(name, handler) { handlers.set(name, handler); },
      emit(name) { assert.ok(handlers.has(name), `Missing ${name} handler on ${id}`); handlers.get(name)(); },
    });
  }
  runInNewContext(script, { document: { querySelector: selector => elements.get(selector) } });
  return id => elements.get('#' + id);
}

test('a visible project brief section explains the work and retains the counter page', () => {
  const section = html.match(/<section class="project-brief" id="project-brief"[\s\S]*?<\/section>/)[0];
  const opening = section.match(/^<section[^>]*>/)[0];
  assert.match(section, /<h2 id="project-brief-title">山间专注 · 协作试验<\/h2>/);
  assert.match(section, /id="project-brief-text"/);
  assert.doesNotMatch(opening, /\b(?:hidden|style|aria-hidden)\b/i);
  for (const id of ['count', 'operations', 'counter-summary', 'increment', 'addTen', 'decrement', 'reset', 'focus-toggle']) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) ?? []).length, 1, id);
  }
});

test('the art display uses the configured relative path and a CSS placeholder', () => {
  const image = html.match(/<img[^>]*id="project-art"[^>]*>/)[0];
  assert.match(image, new RegExp(`src="${artPath.replace(/[/.]/g, '\\$&')}"`));
  assert.match(image, /\bhidden\b/);
  assert.match(image, /alt=""/);
  assert.match(html, new RegExp(`id="project-art-path">${artPath.replace(/[/.]/g, '\\$&')}<\/code>`));
  const styles = html.match(/<style id="project-brief-styles">([\s\S]*?)<\/style>/)[1];
  assert.match(styles, /\.project-art\s*\{[^}]*background: linear-gradient/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.doesNotMatch(styles, /\.project-brief[^{]*\{[^}]*(?:display:\s*none|visibility:\s*hidden)/);
});

test('missing or failed art keeps the placeholder and a late load reveals the image', () => {
  const get = fixture();
  assert.equal(get('project-art').hidden, true);
  assert.equal(get('project-art-placeholder').hidden, false);
  get('project-art').emit('error');
  assert.equal(get('project-art').hidden, true);
  assert.equal(get('project-art-placeholder').hidden, false);
  get('project-art').naturalWidth = 1672;
  get('project-art').emit('load');
  assert.equal(get('project-art').hidden, false);
  assert.equal(get('project-art-placeholder').hidden, true);
  get('project-art').emit('error');
  assert.equal(get('project-art').hidden, true);
  assert.equal(get('project-art-placeholder').hidden, false);
});

test('cached art is recognized when it finished loading before initialization', () => {
  const loaded = fixture({ complete: true, naturalWidth: 1672 });
  assert.equal(loaded('project-art').hidden, false);
  assert.equal(loaded('project-art-placeholder').hidden, true);
  const broken = fixture({ complete: true, naturalWidth: 0 });
  assert.equal(broken('project-art').hidden, true);
  assert.equal(broken('project-art-placeholder').hidden, false);
});

test('README records the new section, custom art path and retained counter behavior', () => {
  assert.ok(readme.includes(artPath));
  assert.match(readme, /美术素材.*占位|CSS.*占位/);
  assert.match(readme, /累计操作/);
  assert.match(readme, /专注模式/);
});
